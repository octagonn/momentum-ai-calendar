import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0';
// Initialize Gemini AI with environment variable
const genAI = new GoogleGenerativeAI(Deno.env.get('EXPO_PUBLIC_GEMINI_API_KEY') || '');
// Initialize planner models (prefer PRO, fallback to FLASH)
let plannerModelPro: any | null = null;
let plannerModelFlash: any | null = null;

try {
  plannerModelPro = genAI.getGenerativeModel({
    model: "gemini-2.0-pro",
    generationConfig: {
      temperature: 0.3,
      topP: 0.9,
      topK: 50,
      maxOutputTokens: 1024
    },
    systemInstruction: `You are an expert life coach and planner implementing a structured conversational state machine for goal planning across ANY domain.

CONVERSATIONAL STATE MACHINE:
You must follow this exact sequence to collect mandatory inputs (S0-S5), then dynamically tailor the plan (S6), and finally generate the schedule (S7).

MANDATORY STATES (S0-S5) - UNIVERSAL FOR ALL GOAL TYPES:
S0: GOAL_INPUT - Ask about their specific goal
S1: DATE_INPUT - Ask about their target date
S2: DAYS_INPUT - Ask about which days they want to work on this
S3: DURATION_INPUT - Ask about time per session
S4: TIME_INPUT - Ask about preferred time of day
S5: STARTING_POINT - Ask about their current level/starting point

DYNAMIC TAILORING (S6) - ADAPT TO GOAL TYPE:
After S5, ask 3-5 additional questions tailored to the specific goal type and context.

GENERATE SCHEDULE (S7):
Only after collecting S0-S5 mandatory inputs AND sufficient S6 dynamic data, generate the complete plan.

CRITICAL RULES:
- Follow the state machine sequence exactly
- Never skip mandatory states S0-S5
- Generate natural, conversational questions tailored to the specific goal
- Use vocabulary and terminology appropriate to the goal domain
- Track progress in planner_state.facts
- Only generate plan after S7 state
- Return only valid JSON
- Be flexible and adaptable to ANY goal domain

CRITICAL: You MUST return ONLY valid JSON. No other text, no explanations, no markdown. Just pure JSON.`
  });
  console.log('[ai_planner] ✅ Initialized Gemini PRO planner model');
} catch (err) {
  console.warn('[ai_planner] ❌ Failed to initialize Gemini PRO planner model', err);
}

try {
  plannerModelFlash = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.3,
      topP: 0.9,
      topK: 50,
      maxOutputTokens: 1024
    },
    systemInstruction: `You are an expert life coach and planner implementing a structured conversational state machine for goal planning across ANY domain.

CONVERSATIONAL STATE MACHINE:
You must follow this exact sequence to collect mandatory inputs (S0-S5), then dynamically tailor the plan (S6), and finally generate the schedule (S7).

MANDATORY STATES (S0-S5) - UNIVERSAL FOR ALL GOAL TYPES:
S0: GOAL_INPUT - Ask about their specific goal
S1: DATE_INPUT - Ask about their target date
S2: DAYS_INPUT - Ask about which days they want to work on this
S3: DURATION_INPUT - Ask about time per session
S4: TIME_INPUT - Ask about preferred time of day
S5: STARTING_POINT - Ask about their current level/starting point

DYNAMIC TAILORING (S6) - ADAPT TO GOAL TYPE:
After S5, ask 3-5 additional questions tailored to the specific goal type and context.

GENERATE SCHEDULE (S7):
Only after collecting S0-S5 mandatory inputs AND sufficient S6 dynamic data, generate the complete plan.

CRITICAL RULES:
- Follow the state machine sequence exactly
- Never skip mandatory states S0-S5
- Generate natural, conversational questions tailored to the specific goal
- Use vocabulary and terminology appropriate to the goal domain
- Track progress in planner_state.facts
- Only generate plan after S7 state
- Return only valid JSON
- Be flexible and adaptable to ANY goal domain

CRITICAL: You MUST return ONLY valid JSON. No other text, no explanations, no markdown. Just pure JSON.`
  });
  console.log('[ai_planner] ✅ Initialized Gemini FLASH planner model');
} catch (err) {
  console.warn('[ai_planner] ❌ Failed to initialize Gemini FLASH planner model', err);
}
// State machine definitions
const STATES = {
  S0_GOAL_INPUT: 'S0_GOAL_INPUT',
  S1_DATE_INPUT: 'S1_DATE_INPUT',
  S2_DAYS_INPUT: 'S2_DAYS_INPUT',
  S3_DURATION_INPUT: 'S3_DURATION_INPUT',
  S4_TIME_INPUT: 'S4_TIME_INPUT',
  S5_STARTING_POINT: 'S5_STARTING_POINT',
  S6_DYNAMIC_TAILORING: 'S6_DYNAMIC_TAILORING',
  S7_GENERATE_SCHEDULE: 'S7_GENERATE_SCHEDULE'
};
// Determine current state based on collected facts
function determineCurrentState(facts) {
  if (!facts.goalTitle) return STATES.S0_GOAL_INPUT;
  if (!facts.targetDate) return STATES.S1_DATE_INPUT;
  if (!facts.workingDays) return STATES.S2_DAYS_INPUT;
  if (!facts.sessionDuration) return STATES.S3_DURATION_INPUT;
  if (!facts.sessionTime) return STATES.S4_TIME_INPUT;
  if (!facts.currentLevel) return STATES.S5_STARTING_POINT;
  if (!facts.dynamicTailoringComplete) return STATES.S6_DYNAMIC_TAILORING;
  return STATES.S7_GENERATE_SCHEDULE;
}
// Parse working days from user input
function parseWorkingDays(workingDaysInput) {
  const input = (workingDaysInput || '').toLowerCase();
  const dayMap = {
    'mon': 'Monday',
    'monday': 'Monday',
    'tue': 'Tuesday',
    'tues': 'Tuesday',
    'tuesday': 'Tuesday',
    'wed': 'Wednesday',
    'wednesday': 'Wednesday',
    'thu': 'Thursday',
    'thurs': 'Thursday',
    'thursday': 'Thursday',
    'fri': 'Friday',
    'friday': 'Friday',
    'sat': 'Saturday',
    'saturday': 'Saturday',
    'sun': 'Sunday',
    'sunday': 'Sunday'
  };
  const days = [];
  const parts = input.split(/[\s,]+/);
  for (const part of parts){
    const key = part.trim();
    if (dayMap[key]) days.push(dayMap[key]);
  }
  return days;
}
// Parse target date from user input
function parseTargetDate(targetDateInput) {
  const input = (targetDateInput || '').toLowerCase().trim();
  const today = new Date();
  const currentYear = today.getFullYear();
  // Relative weeks
  if (/\b\d+\s*weeks?\b/.test(input)) {
    const weeks = parseInt(input.replace(/[^0-9]/g, '')) || 8;
    const d = new Date(today);
    d.setDate(today.getDate() + weeks * 7);
    return d;
  }
  // Relative months
  if (/\b\d+\s*months?\b/.test(input)) {
    const months = parseInt(input.replace(/[^0-9]/g, '')) || 2;
    const d = new Date(today);
    d.setMonth(today.getMonth() + months);
    return d;
  }
  const monthNames = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december'
  ];
  const monthAbbrevs = [
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov',
    'dec'
  ];
  for(let i = 0; i < monthNames.length; i++){
    if (input.includes(monthNames[i]) || input.includes(monthAbbrevs[i])) {
      const dayMatch = input.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
      if (dayMatch) {
        const day = parseInt(dayMatch[1]);
        const d = new Date(currentYear, i, day);
        if (d < today) d.setFullYear(currentYear + 1);
        return d;
      }
    }
  }
  const md = input.match(/(\d{1,2})[\/-](\d{1,2})/);
  if (md) {
    const month = parseInt(md[1]) - 1;
    const day = parseInt(md[2]);
    const d = new Date(currentYear, month, day);
    if (d < today) d.setFullYear(currentYear + 1);
    return d;
  }
  const fallback = new Date(today);
  fallback.setDate(today.getDate() + 56);
  return fallback;
}
function calculateWeeksToTarget(targetDate) {
  const today = new Date();
  const days = Math.max(1, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  return Math.max(1, Math.ceil(days / 7));
}
function parseSessionDurationToMinutes(input) {
  if (!input) return 60;
  const s = input.toLowerCase().trim();
  const hoursMatch = s.match(/(\d+(?:\.\d+)?)\s*(h|hr|hour|hours)/);
  const minsMatch = s.match(/(\d+)\s*(m|min|mins|minute|minutes)/);
  let minutes = 0;
  if (hoursMatch) minutes += Math.round(parseFloat(hoursMatch[1]) * 60);
  if (minsMatch) minutes += parseInt(minsMatch[1]);
  if (!hoursMatch && !minsMatch) {
    const num = parseFloat(s.replace(/[^0-9.]/g, ''));
    if (!isNaN(num)) minutes = num <= 10 ? Math.round(num * 60) : Math.round(num);
  }
  return minutes || 60;
}
function parsePreferredTimeToHM(input) {
  const s = (input || '').toLowerCase().trim();
  let hour = 18, minute = 0;
  // 21:30 or 9:30 pm
  const timeMatch = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let h = parseInt(timeMatch[1]);
    const m = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const ap = timeMatch[3];
    if (ap) {
      if (ap.toLowerCase() === 'pm' && h < 12) h += 12;
      if (ap.toLowerCase() === 'am' && h === 12) h = 0;
    }
    hour = Math.min(23, Math.max(0, h));
    minute = Math.min(59, Math.max(0, m));
    return {
      hour,
      minute
    };
  }
  if (s.includes('late night') || s.includes('night')) return {
    hour: 22,
    minute: 0
  };
  if (s.includes('evening')) return {
    hour: 18,
    minute: 0
  };
  if (s.includes('afternoon')) return {
    hour: 14,
    minute: 0
  };
  if (s.includes('morning')) return {
    hour: 8,
    minute: 0
  };
  return {
    hour,
    minute
  };
}
function deriveSubjectFromGoalTitle(title) {
  const s = (title || '').trim();
  const lower = s.toLowerCase();
  const phrases = [
    'study',
    'for',
    'exam',
    'test',
    'pass',
    'class',
    'course',
    'learn',
    'prepare',
    'certification'
  ];
  let subject = s;
  for (const p of phrases)subject = subject.replace(new RegExp(`\b${p}\b`, 'ig'), '').trim();
  subject = subject.replace(/\s{2,}/g, ' ').trim();
  if (!subject) subject = s;
  return subject.charAt(0).toUpperCase() + subject.slice(1);
}
// FITNESS tasks
function generateFitnessTasks(facts, timezone, targetDate) {
  const workingDays = parseWorkingDays(facts.workingDays);
  const sessionDuration = parseSessionDurationToMinutes(facts.sessionDuration);
  const { hour, minute } = parsePreferredTimeToHM(facts.sessionTime);
  const currentLevel = facts.currentLevel || '';
  const weeks = calculateWeeksToTarget(targetDate);
  const currentWeight = parseInt(String(currentLevel).replace(/[^0-9]/g, '')) || 185;
  const targetWeight = parseInt(String(facts.goalTitle || '').replace(/[^0-9]/g, '')) || 225;
  const totalSessions = Math.max(1, workingDays.length * weeks);
  const weightIncrease = (targetWeight - currentWeight) / totalSessions;
  const tasks = [];
  let seq = 1;
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + daysUntilMonday);
  for(let week = 1; week <= weeks; week++){
    for (const day of workingDays){
      const sessionIndex = workingDays.indexOf(day);
      const sessionNumber = (week - 1) * workingDays.length + (sessionIndex + 1);
      const sessionWeight = Math.round(currentWeight + weightIncrease * (sessionNumber - 1));
      const taskDate = new Date(startDate);
      taskDate.setDate(startDate.getDate() + (week - 1) * 7 + sessionIndex);
      taskDate.setHours(hour, minute, 0, 0);
      const dueAt = taskDate.toISOString();
      const title = `Week ${week} - ${day} Training`;
      const percentage = Math.max(1, Math.round(sessionWeight / Math.max(1, currentWeight) * 100));
      const notes = `Strength session: Bench Press focus. Suggested load ~${sessionWeight} lbs (${percentage}% of current max). Accessory: 3x10 DB Press, 3x10 Rows. Adjust by RPE.`;
      tasks.push({
        title,
        notes,
        due_at: dueAt,
        duration_minutes: sessionDuration,
        all_day: false,
        status: 'pending',
        seq: seq++,
        category: 'workout',
        priority: 'high'
      });
    }
  }
  return tasks;
}
// STUDY tasks
function generateStudyTasks(facts, timezone, targetDate) {
  const workingDays = parseWorkingDays(facts.workingDays);
  const sessionDuration = parseSessionDurationToMinutes(facts.sessionDuration);
  const { hour, minute } = parsePreferredTimeToHM(facts.sessionTime);
  const subject = deriveSubjectFromGoalTitle(facts.goalTitle || 'Study');
  const weeks = calculateWeeksToTarget(targetDate);
  const tasks = [];
  let seq = 1;
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + daysUntilMonday);
  for(let week = 1; week <= weeks; week++){
    for (const day of workingDays){
      const sessionIndex = workingDays.indexOf(day);
      const taskDate = new Date(startDate);
      taskDate.setDate(startDate.getDate() + (week - 1) * 7 + sessionIndex);
      taskDate.setHours(hour, minute, 0, 0);
      const dueAt = taskDate.toISOString();
      const title = `Week ${week} - ${day} Study: ${subject}`;
      const notes = `Study session: Active recall + spaced repetition. Focus on key topics; end with 30m practice problems and quick self-quiz.`;
      tasks.push({
        title,
        notes,
        due_at: dueAt,
        duration_minutes: sessionDuration,
        all_day: false,
        status: 'pending',
        seq: seq++,
        category: 'study',
        priority: 'high'
      });
    }
  // Optional weekly mock test on last working day of each week
  }
  return tasks;
}
function generateGenericTasks(facts, timezone, targetDate) {
  const workingDays = parseWorkingDays(facts.workingDays);
  const sessionDuration = parseSessionDurationToMinutes(facts.sessionDuration);
  const { hour, minute } = parsePreferredTimeToHM(facts.sessionTime);
  const weeks = calculateWeeksToTarget(targetDate);
  const goal = (facts.goalTitle || 'Goal').trim();
  const tasks = [];
  let seq = 1;
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + daysUntilMonday);
  for(let week = 1; week <= weeks; week++){
    for (const day of workingDays){
      const sessionIndex = workingDays.indexOf(day);
      const taskDate = new Date(startDate);
      taskDate.setDate(startDate.getDate() + (week - 1) * 7 + sessionIndex);
      taskDate.setHours(hour, minute, 0, 0);
      const dueAt = taskDate.toISOString();
      const title = `Week ${week} - ${day}: ${goal}`;
      const notes = `Focused work session on: ${goal}. Define subtask, execute, and log summary.`;
      tasks.push({
        title,
        notes,
        due_at: dueAt,
        duration_minutes: sessionDuration,
        all_day: false,
        status: 'pending',
        seq: seq++,
        category: 'general',
        priority: 'high'
      });
    }
  }
  return tasks;
}
function generateTasksForGoalType(goalType, facts, timezone, targetDate) {
  if (goalType === 'fitness') {
    const tasks = generateFitnessTasks(facts, timezone, targetDate);
    return {
      tasks,
      description: 'Progressive training plan with session-by-session progression and accessory work.',
      category: 'workout'
    };
  }
  if (goalType === 'study') {
    const tasks = generateStudyTasks(facts, timezone, targetDate);
    return {
      tasks,
      description: 'Structured study plan using active recall, spaced repetition, and practice.',
      category: 'study'
    };
  }
  const tasks = generateGenericTasks(facts, timezone, targetDate);
  return {
    tasks,
    description: 'Structured work blocks scheduled consistently to achieve the goal by the target date.',
    category: 'general'
  };
}
// Robust JSON extraction function
function extractJSONFromResponse(text) {
  let jsonText = text.trim();
  if (jsonText.startsWith('```json')) jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  else if (jsonText.startsWith('```')) jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  const jsonStart = jsonText.indexOf('{');
  if (jsonStart === -1) throw new Error('No JSON object found in response');
  jsonText = jsonText.substring(jsonStart);
  let braceCount = 0, jsonEnd = -1, inString = false, escapeNext = false;
  for(let i = 0; i < jsonText.length; i++){
    const char = jsonText[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') braceCount++;
      else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          jsonEnd = i + 1;
          break;
        }
      }
    }
  }
  if (jsonEnd === -1) throw new Error('Incomplete JSON object in response');
  return jsonText.substring(0, jsonEnd);
}
Deno.serve(async (req)=>{
  try {
    const apiKey = Deno.env.get('EXPO_PUBLIC_GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({
        status: 'error',
        message: 'EXPO_PUBLIC_GEMINI_API_KEY not configured',
        planner_state: {
          facts: {},
          missing_fields: [],
          version: 1
        },
        rationale: 'API key not configured'
      }), {
        headers: {
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    const { session_id, user_id, timezone, today_iso, context, transcript, planner_state, mode } = await req.json();
    // Determine current state
    const currentState = determineCurrentState(planner_state.facts);
    // If S7, generate plan
    if (currentState === STATES.S7_GENERATE_SCHEDULE) {
      const goalType = planner_state.facts.goalType || detectGoalType(planner_state.facts.goalTitle || '');
      const targetDate = parseTargetDate(planner_state.facts.targetDate);
      const { tasks, description } = generateTasksForGoalType(goalType, planner_state.facts, timezone, targetDate);
      const targetDateStr = targetDate.toISOString().split('T')[0];
      const allowedDays = parseWorkingDays(planner_state.facts.workingDays);
      const timelineWeeks = calculateWeeksToTarget(targetDate);
      const titleRaw = (planner_state.facts.goalTitle || 'Goal').trim();
      const title = titleRaw.charAt(0).toUpperCase() + titleRaw.slice(1);
      const plan = {
        status: 'plan',
        plan: {
          goal: {
            title,
            description: `${description} Target: ${targetDateStr}. Schedule: ${allowedDays.join(', ')} at ${(planner_state.facts.sessionTime || '').toString()}.`,
            target_date: targetDateStr,
            status: 'active',
            color: '#3B82F6',
            metadata: {
              goal_type: goalType,
              training_days: planner_state.facts.workingDays,
              session_duration: planner_state.facts.sessionDuration,
              session_time: planner_state.facts.sessionTime,
              total_weeks: timelineWeeks,
              total_sessions: tasks.length
            }
          },
          tasks,
          plan_details: {
            goal_type: goalType,
            timeline: `${timelineWeeks} weeks`,
            scheduling_rules: {
              allowed_days: allowedDays,
              timezone
            }
          }
        },
        planner_state: {
          facts: {},
          missing_fields: [],
          version: 1
        },
        rationale: `Generated ${goalType} plan with ${tasks.length} sessions over ${timelineWeeks} weeks.`
      };
      return new Response(JSON.stringify(plan), {
        headers: {
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    // For S0-S6, generate intelligent questions using AI
    const questionPrompt = `You are a multi-domain coach. Based on the conversation, generate the next question following the state machine.

CONVERSATION:\n${transcript.map((t)=>`${t.role}: ${t.content}`).join('\n')}
CURRENT STATE: ${currentState}
FACTS: ${JSON.stringify(planner_state.facts)}

Rules:
- Ask exactly one clear, concise question.
- Tailor vocabulary to the detected goal domain.
- Stay on-topic with the user's goal.

Return ONLY JSON:
{ "status": "ask", "question": "...", "missing_fields": ["${currentState}"], "priority": "high", "planner_state": { "facts": {}, "missing_fields": ["${currentState}"], "version": 1 }, "rationale": "why" }`;
    // Prefer PRO for question generation, fallback to FLASH
    let text: string;
    try {
      const resultPro = await (plannerModelPro || plannerModelFlash).generateContent(questionPrompt);
      const responsePro = await resultPro.response;
      text = responsePro.text();
    } catch (primaryErr) {
      console.warn('[ai_planner] ⚠️ Primary model failed for S0–S6 question generation. Attempting fallback...', primaryErr);
      if (plannerModelPro && plannerModelFlash) {
        const resultFlash = await plannerModelFlash.generateContent(questionPrompt);
        const responseFlash = await resultFlash.response;
        text = responseFlash.text();
      } else {
        throw primaryErr;
      }
    }
    const jsonText = extractJSONFromResponse(text);
    const plannerResponse = JSON.parse(jsonText);
    // Update facts from last user message
    const lastUser = transcript.filter((t)=>t.role === 'user').pop();
    if (lastUser) {
      const val = lastUser.content;
      switch(currentState){
        case STATES.S0_GOAL_INPUT:
          planner_state.facts.goalTitle = val;
          planner_state.facts.goalType = detectGoalType(val);
          break;
        case STATES.S1_DATE_INPUT:
          planner_state.facts.targetDate = val;
          break;
        case STATES.S2_DAYS_INPUT:
          planner_state.facts.workingDays = val;
          break;
        case STATES.S3_DURATION_INPUT:
          planner_state.facts.sessionDuration = val;
          break;
        case STATES.S4_TIME_INPUT:
          planner_state.facts.sessionTime = val;
          break;
        case STATES.S5_STARTING_POINT:
          planner_state.facts.currentLevel = val;
          break;
        case STATES.S6_DYNAMIC_TAILORING:
          planner_state.facts.dynamicInfo = planner_state.facts.dynamicInfo || {};
          constqs: any = planner_state.facts.dynamicInfo;
          const idx = Object.keys(constqs).length + 1;
          planner_state.facts.dynamicInfo[`question_${idx}`] = val;
          if (idx >= 3) planner_state.facts.dynamicTailoringComplete = true;
          break;
      }
    }
    plannerResponse.planner_state.facts = planner_state.facts;
    plannerResponse.planner_state.version = planner_state.version + 1;
    return new Response(JSON.stringify(plannerResponse), {
      headers: {
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      message: error.message || 'Unknown error',
      planner_state: {
        facts: {},
        missing_fields: [],
        version: 1
      },
      rationale: 'Error occurred during planning'
    }), {
      headers: {
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
// Detect goal type from the goal title
function detectGoalType(goalTitle) {
  const title = (goalTitle || '').toLowerCase();
  if (/(bench|squat|deadlift|workout|fitness|gym|weight|muscle|strength|cardio|running|exercise)/.test(title)) return 'fitness';
  if (/(study|learn|course|exam|test|certification|skill|programming|language|homework|assignment)/.test(title)) return 'study';
  if (/(work|career|job|promotion|project|business|startup|interview)/.test(title)) return 'work';
  if (/(money|budget|save|invest|debt|financial|income|expense)/.test(title)) return 'financial';
  if (/(health|medical|doctor|diet|nutrition|sleep|mental|therapy)/.test(title)) return 'health';
  if (/(art|music|writing|draw|paint|creative|design|photography)/.test(title)) return 'creative';
  if (/(relationship|dating|marriage|family|friend|social)/.test(title)) return 'relationship';
  if (/(hobby|craft|garden|cook|travel|read)/.test(title)) return 'hobby';
  return 'personal';
}


