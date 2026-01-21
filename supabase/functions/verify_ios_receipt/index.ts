// deno-lint-ignore-file no-explicit-any
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const SHARED_SECRET = Deno.env.get('APPLE_SHARED_SECRET');

interface VerifyResponse {
  status: number;
  environment?: string;
  latest_receipt_info?: any[];
  pending_renewal_info?: any[];
  latest_receipt?: string;
}

// Apple status code definitions
const APPLE_STATUS_CODES: Record<number, string> = {
  0: 'Valid receipt',
  21000: 'The App Store could not read the JSON object you provided',
  21002: 'The data in the receipt-data property was malformed or missing',
  21003: 'The receipt could not be authenticated',
  21004: 'The shared secret you provided does not match the shared secret on file for your account',
  21005: 'The receipt server is not currently available',
  21006: 'This receipt is valid but the subscription has expired',
  21007: 'This receipt is from the test environment, but it was sent to the production environment for verification',
  21008: 'This receipt is from the production environment, but it was sent to the test environment for verification',
  21009: 'Internal data access error',
  21010: 'The user account cannot be found or has been deleted',
};

function isActive(latest: any): boolean {
  if (!latest) return false;
  const expiresMs = Number(latest.expires_date_ms || latest.expires_date) || 0;
  return expiresMs > Date.now();
}

function mapEntitlement(json: VerifyResponse): any {
  const info = json.latest_receipt_info || [];
  const latest = info.sort((a, b) => (Number(b.expires_date_ms || 0) - Number(a.expires_date_ms || 0)))[0];
  if (!latest) return { isActive: false, status: json.status };
  return {
    isActive: isActive(latest),
    productId: latest.product_id,
    originalPurchaseDate: latest.original_purchase_date_ms ? new Date(Number(latest.original_purchase_date_ms)).toISOString() : undefined,
    expiresAt: latest.expires_date_ms ? new Date(Number(latest.expires_date_ms)).toISOString() : undefined,
    environment: json.environment,
    status: json.status,
  };
}

async function callAppleVerify(url: string, receipt: string): Promise<VerifyResponse> {
  const body = {
    'receipt-data': receipt,
    'password': SHARED_SECRET,
    'exclude-old-transactions': true,
  };
  
  console.log(`[verify_ios_receipt] Calling Apple API: ${url}`);
  console.log(`[verify_ios_receipt] Receipt length: ${receipt?.length || 0}`);
  
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    // Check for HTTP errors (401, 500, etc.)
    if (!resp.ok) {
      const statusText = resp.statusText || 'Unknown error';
      console.error(`[verify_ios_receipt] Apple API HTTP error: ${resp.status} ${statusText}`);
      
      // Handle 401 Unauthorized specifically
      if (resp.status === 401) {
        throw new Error(`Apple API authentication failed (401): ${statusText}. Check APPLE_SHARED_SECRET configuration.`);
      }
      
      throw new Error(`Apple API returned HTTP ${resp.status}: ${statusText}`);
    }
    
    const json = await resp.json() as VerifyResponse;
    console.log(`[verify_ios_receipt] Apple API response status: ${json.status} (${APPLE_STATUS_CODES[json.status] || 'Unknown status'})`);
    
    return json;
  } catch (error) {
    console.error(`[verify_ios_receipt] Error calling Apple API:`, error);
    throw error;
  }
}

function getStatusErrorMessage(status: number): string {
  return APPLE_STATUS_CODES[status] || `Unknown status code: ${status}`;
}

Deno.serve(async (req: Request) => {
  const startTime = Date.now();
  console.log('[verify_ios_receipt] Receipt verification request received');
  
  try {
    if (!SHARED_SECRET) {
      console.error('[verify_ios_receipt] APPLE_SHARED_SECRET not configured');
      return new Response(JSON.stringify({ error: 'Server not configured (APPLE_SHARED_SECRET missing)' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const { receipt } = await req.json();
    if (!receipt) {
      console.error('[verify_ios_receipt] Missing receipt in request');
      return new Response(JSON.stringify({ error: 'Missing receipt' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[verify_ios_receipt] Starting receipt validation...');

    // First try production
    let json = await callAppleVerify('https://buy.itunes.apple.com/verifyReceipt', receipt);
    
    // Handle status codes that require sandbox retry
    if (json.status === 21007) {
      console.log('[verify_ios_receipt] Status 21007 detected - retrying with sandbox environment');
      json = await callAppleVerify('https://sandbox.itunes.apple.com/verifyReceipt', receipt);
    }
    
    // Handle status code 21008 (production receipt sent to sandbox)
    if (json.status === 21008) {
      console.log('[verify_ios_receipt] Status 21008 detected - retrying with production environment');
      json = await callAppleVerify('https://buy.itunes.apple.com/verifyReceipt', receipt);
    }

    // Handle all error status codes (21000-21010)
    if (json.status !== 0 && json.status >= 21000 && json.status <= 21010) {
      const errorMessage = getStatusErrorMessage(json.status);
      console.error(`[verify_ios_receipt] Apple status error: ${json.status} - ${errorMessage}`);
      
      // Return error response with status code information
      return new Response(JSON.stringify({ 
        error: errorMessage,
        status: json.status,
        isActive: false,
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200, // Return 200 but with error in payload
      });
    }

    // Status 0 means valid receipt
    if (json.status === 0) {
      console.log('[verify_ios_receipt] Receipt validation successful (status 0)');
    }

    const entitlement = mapEntitlement(json);
    const duration = Date.now() - startTime;
    console.log(`[verify_ios_receipt] Receipt validation completed in ${duration}ms`, {
      isActive: entitlement.isActive,
      productId: entitlement.productId,
      status: entitlement.status,
    });
    
    return new Response(JSON.stringify(entitlement), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    const duration = Date.now() - startTime;
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error(`[verify_ios_receipt] Receipt verification failed after ${duration}ms:`, errorMessage);
    
    // Check if it's a 401 error
    if (errorMessage.includes('401') || errorMessage.includes('authentication failed')) {
      return new Response(JSON.stringify({ 
        error: 'Authentication failed with Apple API. Please check APPLE_SHARED_SECRET configuration.',
        status: 401,
        isActive: false,
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200, // Return 200 but with error in payload
      });
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      isActive: false,
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});


