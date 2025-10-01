import { format, parseISO, isValid, addDays, differenceInDays } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import { InterviewFields, InterviewFieldsZ } from './planSchema';

export interface InterviewState {
  fields: Partial<InterviewFields>;
  currentQuestion: string | null;
  isComplete: boolean;
  error: string | null;
}

export class InterviewEngine {
  private state: InterviewState = {
    fields: {},
    currentQuestion: null,
    isComplete: false,
    error: null,
  };

  private readonly requiredFields: (keyof InterviewFields)[] = [
    'goal_title',
    'target_date',
    'days_per_week',
    'session_minutes',
    'preferred_days',
    'time_of_day'
  ];

  private readonly questions = {
    goal_title: "What's your goal? (e.g., 'I want to bench 225 pounds')",
    target_date: "When do you want to achieve this? (e.g., '2024-12-31' or 'in 3 months')",
    days_per_week: "How many days per week can you work on this? (1-7)",
    session_minutes: "How many minutes per session? (e.g., 45)",
    preferred_days: "Which days work best? (e.g., 'Mon,Wed,Fri' or 'Monday,Wednesday,Friday')",
    time_of_day: "What time of day? (e.g., '08:00', '18:30', or leave blank for default)"
  };

  constructor() {
    this.nextQuestion();
  }

  getState(): InterviewState {
    return { ...this.state };
  }

  acceptAnswer(answer: string): { success: boolean; error?: string; nextQuestion?: string } {
    const currentField = this.getCurrentField();
    if (!currentField) {
      return { success: false, error: "No active question" };
    }

    const validation = this.validateAnswer(currentField, answer);
    if (!validation.success) {
      this.state.error = validation.error || "Invalid input";
      return { success: false, error: validation.error };
    }

    // Store the validated answer
    this.state.fields[currentField] = validation.value as any;
    this.state.error = null;

    // Check if we have all required fields
    if (this.isComplete()) {
      this.state.isComplete = true;
      this.state.currentQuestion = null;
      return { success: true };
    }

    // Move to next question
    this.nextQuestion();
    return { success: true, nextQuestion: this.state.currentQuestion };
  }

  private getCurrentField(): keyof InterviewFields | null {
    for (const field of this.requiredFields) {
      if (!(field in this.state.fields)) {
        return field;
      }
    }
    return null;
  }

  private nextQuestion(): void {
    const currentField = this.getCurrentField();
    this.state.currentQuestion = currentField ? this.questions[currentField] : null;
  }

  private validateAnswer(field: keyof InterviewFields, answer: string): { success: boolean; value?: any; error?: string } {
    const trimmed = answer.trim();

    switch (field) {
      case 'goal_title':
        if (trimmed.length < 3) {
          return { success: false, error: "Goal title must be at least 3 characters" };
        }
        return { success: true, value: trimmed };

      case 'target_date':
        return this.validateTargetDate(trimmed);

      case 'days_per_week':
        const days = parseInt(trimmed);
        if (isNaN(days) || days < 1 || days > 7) {
          return { success: false, error: "Days per week must be between 1 and 7" };
        }
        return { success: true, value: days };

      case 'session_minutes':
        const minutes = parseInt(trimmed);
        if (isNaN(minutes) || minutes < 1) {
          return { success: false, error: "Session minutes must be a positive number" };
        }
        return { success: true, value: minutes };

      case 'preferred_days':
        return this.validatePreferredDays(trimmed);

      case 'time_of_day':
        if (trimmed === '' || trimmed.toLowerCase() === 'default') {
          return { success: true, value: null };
        }
        return this.validateTimeOfDay(trimmed);

      default:
        return { success: false, error: "Unknown field" };
    }
  }

  private validateTargetDate(answer: string): { success: boolean; value?: string; error?: string } {
    // Try to parse relative dates like "in 3 months", "next month", etc.
    let targetDate: Date;
    
    if (answer.toLowerCase().includes('month')) {
      const months = parseInt(answer.match(/\d+/)?.[0] || '1');
      targetDate = addDays(new Date(), months * 30);
    } else if (answer.toLowerCase().includes('week')) {
      const weeks = parseInt(answer.match(/\d+/)?.[0] || '1');
      targetDate = addDays(new Date(), weeks * 7);
    } else if (answer.toLowerCase().includes('day')) {
      const days = parseInt(answer.match(/\d+/)?.[0] || '1');
      targetDate = addDays(new Date(), days);
    } else {
      // Try to parse as ISO date
      try {
        targetDate = parseISO(answer);
        if (!isValid(targetDate)) {
          return { success: false, error: "Invalid date format. Use YYYY-MM-DD or 'in X weeks/months'" };
        }
      } catch {
        return { success: false, error: "Invalid date format. Use YYYY-MM-DD or 'in X weeks/months'" };
      }
    }

    // Check if date is in the future
    if (targetDate <= new Date()) {
      return { success: false, error: "Target date must be in the future" };
    }

    return { success: true, value: targetDate.toISOString() };
  }

  private validatePreferredDays(answer: string): { success: boolean; value?: string[]; error?: string } {
    const dayMap: { [key: string]: string } = {
      'monday': 'Mon', 'mon': 'Mon',
      'tuesday': 'Tue', 'tue': 'Tue', 'tues': 'Tue',
      'wednesday': 'Wed', 'wed': 'Wed',
      'thursday': 'Thu', 'thu': 'Thu', 'thurs': 'Thu',
      'friday': 'Fri', 'fri': 'Fri',
      'saturday': 'Sat', 'sat': 'Sat',
      'sunday': 'Sun', 'sun': 'Sun'
    };

    const days = answer.split(/[,\s]+/).map(d => d.trim().toLowerCase()).filter(Boolean);
    const validDays: string[] = [];

    for (const day of days) {
      const mapped = dayMap[day];
      if (mapped && !validDays.includes(mapped)) {
        validDays.push(mapped);
      }
    }

    if (validDays.length === 0) {
      return { success: false, error: "Please specify valid days (e.g., 'Mon,Wed,Fri' or 'Monday,Wednesday,Friday')" };
    }

    return { success: true, value: validDays };
  }

  private validateTimeOfDay(answer: string): { success: boolean; value?: string; error?: string } {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(answer)) {
      return { success: false, error: "Time must be in HH:MM format (e.g., '08:00', '18:30')" };
    }
    return { success: true, value: answer };
  }

  isComplete(): boolean {
    return this.requiredFields.every(field => field in this.state.fields);
  }

  getFields(): Partial<InterviewFields> {
    return { ...this.state.fields };
  }

  getValidatedFields(): InterviewFields | null {
    if (!this.isComplete()) return null;
    
    try {
      return InterviewFieldsZ.parse(this.state.fields);
    } catch {
      return null;
    }
  }

  // Check for unrealistic timeline
  checkTimelineRealism(minSessionsRequired: number = 10): { isRealistic: boolean; suggestion?: string } {
    const fields = this.getValidatedFields();
    if (!fields) return { isRealistic: true };

    const targetDate = parseISO(fields.target_date);
    const now = new Date();
    const weeksUntilTarget = Math.ceil(differenceInDays(targetDate, now) / 7);
    const totalSessions = weeksUntilTarget * fields.days_per_week;

    if (totalSessions < minSessionsRequired) {
      const suggestedWeeks = Math.ceil(minSessionsRequired / fields.days_per_week);
      const suggestedDate = addDays(now, suggestedWeeks * 7);
      
      return {
        isRealistic: false,
        suggestion: `This timeline seems tight. Want me to push target to ${format(suggestedDate, 'yyyy-MM-dd')} or increase days/week?`
      };
    }

    return { isRealistic: true };
  }

  reset(): void {
    this.state = {
      fields: {},
      currentQuestion: null,
      isComplete: false,
      error: null,
    };
    this.nextQuestion();
  }
}

