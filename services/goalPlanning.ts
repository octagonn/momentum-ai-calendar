import { createClient } from '@supabase/supabase-js';
import { InterviewFields, ScheduledSlot } from '../lib/ai/planSchema';
import { buildSchedule } from '../lib/ai/scheduler';

// In-memory deduplication cache
const dedupeCache = new Map<string, { timestamp: number; result: any }>();
const DEDUPE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

interface CompleteGoalParams {
  transcript: Array<{role: 'user' | 'assistant', content: string}>;
  fields: InterviewFields;
  accessToken: string;
  userId: string;
}

interface CompleteGoalResult {
  goal_id: string;
  plan: any;
}

export async function completeGoalFromInterview({ 
  transcript, 
  fields, 
  accessToken, 
  userId 
}: CompleteGoalParams): Promise<CompleteGoalResult> {
  // Create deduplication hash
  const payloadHash = await createPayloadHash({ transcript, fields });
  
  // Check for recent duplicate
  const cached = dedupeCache.get(payloadHash);
  if (cached && (Date.now() - cached.timestamp) < DEDUPE_WINDOW_MS) {
    console.log('Returning cached result for duplicate request');
    return cached.result;
  }

  // Generate scheduled slots
  const scheduledSlots = buildSchedule(fields);
  
  // Validate schedule
  const { isValid, errors } = validateSchedule(scheduledSlots);
  if (!isValid) {
    throw new Error(`Invalid schedule: ${errors.join(', ')}`);
  }

  // Get Edge Function URL
  const edgeUrl = process.env.EXPO_PUBLIC_EDGE_URL;
  if (!edgeUrl) {
    throw new Error('EXPO_PUBLIC_EDGE_URL not configured');
  }

  try {
    const response = await fetch(`${edgeUrl}/ai_plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        transcript,
        fields: {
          ...fields,
          user_id: userId, // Add user_id to fields for the Edge Function
        },
        tz,
        scheduled_slots: scheduledSlots,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Cache the result for deduplication
    dedupeCache.set(payloadHash, {
      timestamp: Date.now(),
      result,
    });

    // Clean up old cache entries
    cleanupDedupeCache();

    return result;
  } catch (error) {
    console.error('Error calling ai_plan Edge Function:', error);
    throw error;
  }
}

async function createPayloadHash(payload: any): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function validateSchedule(scheduledSlots: ScheduledSlot[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (scheduledSlots.length === 0) {
    errors.push('No scheduled slots generated');
    return { isValid: false, errors };
  }
  
  // Check for duplicate due_at times
  const dueAtTimes = scheduledSlots.map(slot => slot.due_at);
  const uniqueTimes = new Set(dueAtTimes);
  if (uniqueTimes.size !== dueAtTimes.length) {
    errors.push('Duplicate due_at times found');
  }
  
  // Check for invalid due_at times (in the past)
  const now = new Date();
  for (const slot of scheduledSlots) {
    const dueAt = new Date(slot.due_at);
    if (dueAt <= now) {
      errors.push(`Slot ${slot.seq} is scheduled in the past`);
    }
  }
  
  // Check for proper sequencing
  const seqNumbers = scheduledSlots.map(slot => slot.seq).sort((a, b) => a - b);
  for (let i = 0; i < seqNumbers.length; i++) {
    if (seqNumbers[i] !== i + 1) {
      errors.push('Invalid sequence numbers');
      break;
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

function cleanupDedupeCache(): void {
  const now = Date.now();
  for (const [key, value] of dedupeCache.entries()) {
    if (now - value.timestamp > DEDUPE_WINDOW_MS) {
      dedupeCache.delete(key);
    }
  }
}

// Helper function to create or update user profile
export async function ensureUserProfile(supabase: any, userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to ensure user profile:', error);
    }
  } catch (error) {
    console.error('Error ensuring user profile:', error);
  }
}

