import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.16.1/mod.ts";

// Zod schemas (matching client-side)
const TaskZ = z.object({
  title: z.string(),
  notes: z.string().optional(),
  due_at: z.string(), // ISO 8601
  duration_minutes: z.number().int().positive().optional(),
  all_day: z.boolean().optional(),
  status: z.enum(['pending','done','skipped']).optional(),
  seq: z.number().int().optional(),
});

const GoalZ = z.object({
  title: z.string(),
  description: z.string().optional(),
  target_date: z.string().optional(),
  status: z.enum(['active','paused','completed','archived']).optional(),
});

const PlanZ = z.object({
  goal: GoalZ,
  tasks: z.array(TaskZ).min(1)
});

type Plan = z.infer<typeof PlanZ>;

interface RequestBody {
  transcript: Array<{role: 'user' | 'assistant', content: string}>;
  fields: {
    goal_title: string;
    target_date: string;
    days_per_week: number;
    session_minutes: number;
    preferred_days: string[];
    time_of_day?: string;
  };
  scheduled_slots?: Array<{
    title: string;
    due_at: string;
    duration_minutes: number;
    seq: number;
  }>;
}

serve(async (req) => {
  try {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { transcript, fields, scheduled_slots }: RequestBody = await req.json();

    // Validate required fields
    if (!transcript || !fields) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: transcript, fields' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get environment variables
    const geminiModel = Deno.env.get("GEMINI_MODEL") || "gemini-1.5-pro";
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!geminiKey || !supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return new Response(JSON.stringify({ 
        error: 'Missing required environment variables' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get user ID from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // For now, we'll extract user_id from the request body or use a placeholder
    // In production, you'd verify the JWT token
    const userId = fields.user_id || '00000000-0000-0000-0000-000000000000';

    // Prepare the prompt for Gemini
    const prompt = `You are structuring a goal plan JSON. Keep due_at unchanged. Output only valid JSON.

User goal: ${fields.goal_title}
Target date: ${fields.target_date}
Days per week: ${fields.days_per_week}
Session minutes: ${fields.session_minutes}
Preferred days: ${fields.preferred_days.join(', ')}
Time of day: ${fields.time_of_day || 'default'}

Scheduled slots:
${scheduled_slots ? scheduled_slots.map(slot => 
  `- ${slot.title}: ${slot.due_at} (${slot.duration_minutes} min, seq: ${slot.seq})`
).join('\n') : 'None provided'}

Transcript:
${transcript.map(t => `${t.role}: ${t.content}`).join('\n')}

Return improved task titles and a 1-2 sentence goal description. Keep the same due_at and seq. Output only JSON matching this schema: { goal: {...}, tasks: [...] }`;

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ 
            role: "user", 
            parts: [{ text: prompt }]
          }],
          generationConfig: { 
            responseMimeType: "application/json",
            temperature: 0.1
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      return new Response(JSON.stringify({ 
        error: 'Failed to generate plan from AI' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    
    let plan: Plan;
    try {
      const parsedPlan = JSON.parse(responseText);
      plan = PlanZ.parse(parsedPlan);
    } catch (error) {
      console.error('Plan validation error:', error);
      return new Response(JSON.stringify({ 
        error: 'Invalid plan structure from AI',
        details: error instanceof Error ? error.message : 'Unknown validation error'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Insert into database using RPC
    const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/create_goal_with_tasks`, {
      method: "POST",
      headers: {
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        p_user_id: userId,
        p_goal: plan.goal,
        p_tasks: plan.tasks
      })
    });

    if (!rpcResponse.ok) {
      const errorText = await rpcResponse.text();
      console.error('Database insert error:', errorText);
      return new Response(JSON.stringify({ 
        error: 'Failed to save goal and tasks to database',
        details: errorText
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const goalId = await rpcResponse.text();
    
    return new Response(JSON.stringify({ 
      goal_id: goalId.replace(/"/g, ''), // Remove quotes from UUID
      plan 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
      }
    });
  }
});

