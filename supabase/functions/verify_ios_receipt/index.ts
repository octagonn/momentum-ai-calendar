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

function isActive(latest: any): boolean {
  if (!latest) return false;
  const expiresMs = Number(latest.expires_date_ms || latest.expires_date) || 0;
  return expiresMs > Date.now();
}

function mapEntitlement(json: VerifyResponse): any {
  const info = json.latest_receipt_info || [];
  const latest = info.sort((a, b) => (Number(b.expires_date_ms || 0) - Number(a.expires_date_ms || 0)))[0];
  if (!latest) return { isActive: false };
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
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return await resp.json() as VerifyResponse;
}

Deno.serve(async (req: Request) => {
  try {
    if (!SHARED_SECRET) {
      return new Response(JSON.stringify({ error: 'Server not configured (APPLE_SHARED_SECRET missing)' }), { status: 500 });
    }
    const { receipt } = await req.json();
    if (!receipt) {
      return new Response(JSON.stringify({ error: 'Missing receipt' }), { status: 400 });
    }

    // First try production
    let json = await callAppleVerify('https://buy.itunes.apple.com/verifyReceipt', receipt);
    // If prod returns 21007, retry sandbox
    if (json.status === 21007) {
      json = await callAppleVerify('https://sandbox.itunes.apple.com/verifyReceipt', receipt);
    }

    const entitlement = mapEntitlement(json);
    return new Response(JSON.stringify(entitlement), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});


