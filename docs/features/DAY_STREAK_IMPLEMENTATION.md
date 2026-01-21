# Day Streak Feature Implementation

## Overview

The Day Streak feature tracks consecutive days where users complete their scheduled tasks. It's designed to encourage daily engagement while being fair about days with no scheduled work.

## How It Works

### Streak Logic

#### ✅ **Increment Streak**
- **When**: User completes at least one task on a day that has tasks scheduled
- **Effect**: Streak increments by 1 (if consecutive day)
- **Example**: If streak is 5 and user completes tasks today → streak becomes 6

#### ❌ **Break Streak**
- **When**: User has tasks scheduled for a day but doesn't complete ANY of them
- **Effect**: Streak resets to 0
- **Example**: If streak is 10 and user misses completing tasks on a day with scheduled tasks → streak becomes 0

#### ⏸️ **No Change**
- **When**: Day has NO tasks scheduled
- **Effect**: Streak neither increments nor breaks
- **Example**: If streak is 7 and user has no tasks today → streak stays 7 tomorrow

### Special Rules

1. **Starting a Streak (streak = 0)**
   - Must complete tasks on a day that HAS tasks
   - Cannot start a streak on a day with no tasks
   - This prevents "free" streak days

2. **Maintaining a Streak (streak > 0)**
   - Days with no tasks don't increment the streak
   - Days with no tasks don't break the streak
   - Only days with scheduled tasks affect the streak

3. **Consecutive Days**
   - Streak only increments on consecutive days
   - Missing a day with tasks breaks the streak
   - Missing a day without tasks has no effect

## Implementation Details

### Database Schema

**Table**: `user_profiles`

New columns added:
```sql
- day_streak INTEGER DEFAULT 0
  - Current streak count
  
- last_streak_date DATE
  - Last date the streak was updated
  - Used to check if days are consecutive
  
- streak_updated_at TIMESTAMPTZ DEFAULT NOW()
  - Timestamp of last streak update
```

### Service Layer

**File**: `services/dayStreakService.ts`

#### Key Functions

1. **`checkAndUpdateDayStreak(userId: string)`**
   - Called when a task is completed
   - Checks if user has tasks today
   - Updates streak based on completion status
   - Returns current streak count

2. **`validateDayStreak(userId: string)`**
   - Called when app opens
   - Checks for missed days
   - Breaks streak if tasks were missed
   - Returns current streak count

3. **`getCurrentStreak(userId: string)`**
   - Simple getter for current streak
   - Used for display purposes

### Integration Points

#### 1. **UserProvider** (`providers/UserProvider.tsx`)
```typescript
// On profile load:
await validateDayStreak(authUser.id);
const currentStreak = await checkAndUpdateDayStreak(authUser.id);

// Set in user object:
dayStreak: currentStreak
```

#### 2. **GoalsProvider** (`providers/GoalsProvider.tsx`)
```typescript
// After task is marked as complete:
if (updates.completed) {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await checkAndUpdateDayStreak(user.id);
  }
}
```

#### 3. **HomeScreen** (`app/(tabs)/(home)/home.tsx`)
- Displays the current streak in the stats section
- Shows: `{ label: "Day Streak", value: user.dayStreak.toString() }`

## User Experience Flow

### Starting a New Streak

1. User has 0 streak
2. User creates/has tasks for today
3. User completes at least one task
4. ✅ Streak becomes 1

### Maintaining a Streak

**Day 1**: Complete tasks → Streak: 1  
**Day 2**: Complete tasks → Streak: 2  
**Day 3**: No tasks scheduled → Streak: 2 (unchanged)  
**Day 4**: Complete tasks → Streak: 3  
**Day 5**: Has tasks, completes none → Streak: 0 (broken)

### Edge Cases Handled

1. **App not opened for multiple days**
   - `validateDayStreak` checks all missed days
   - Breaks streak if any missed day had incomplete tasks
   - Ignores days with no tasks

2. **Multiple task completions in one day**
   - Streak only increments once per day
   - Tracked via `last_streak_date`

3. **Task unmarked (uncompleted)**
   - Does not affect streak
   - Only marking tasks as complete triggers streak check

4. **Timezone handling**
   - All dates normalized to midnight (00:00:00)
   - Uses ISO date strings for consistency

## Testing Scenarios

### Scenario 1: Normal Streak Building
```
Day 1: 3 tasks, complete 3 → Streak: 1 ✓
Day 2: 2 tasks, complete 1 → Streak: 2 ✓
Day 3: 4 tasks, complete 4 → Streak: 3 ✓
```

### Scenario 2: Days Without Tasks
```
Day 1: 2 tasks, complete 2 → Streak: 1 ✓
Day 2: 0 tasks, complete 0 → Streak: 1 (unchanged) ✓
Day 3: 3 tasks, complete 3 → Streak: 2 ✓
```

### Scenario 3: Breaking Streak
```
Day 1: 2 tasks, complete 2 → Streak: 1 ✓
Day 2: 3 tasks, complete 0 → Streak: 0 (broken) ✓
Day 3: 2 tasks, complete 2 → Streak: 1 (restarted) ✓
```

### Scenario 4: Cannot Start on Empty Day
```
Day 1: 0 tasks, complete 0 → Streak: 0 (no change) ✓
Day 2: 3 tasks, complete 3 → Streak: 1 (started) ✓
```

### Scenario 5: App Not Opened
```
Day 1: Open app, 2 tasks, complete 2 → Streak: 1
Day 2-3: Don't open app (has 5 tasks total, none completed)
Day 4: Open app → validateDayStreak() runs → Streak: 0 (broken) ✓
```

## Migration

**File**: `supabase/migrations/20250114100000_add_day_streak.sql`

To apply this migration:
```bash
# If using Supabase CLI
supabase db push

# Or apply manually in Supabase dashboard SQL editor
```

## Future Enhancements

Possible improvements:
1. **Streak Rewards**: Achievements for milestones (7, 30, 100 days)
2. **Streak Recovery**: One "free pass" per month
3. **Statistics**: Show longest streak, current streak history
4. **Notifications**: Remind users to maintain streak
5. **Social Features**: Share streak achievements
6. **Streak Freezes**: Allow premium users to freeze streak for vacation

## Notes

- Streak is **activity-based**, not calendar-based
- Designed to be **fair and encouraging**
- Only counts **productive days** (days with scheduled work)
- **Prevents gaming** the system with empty days
- **Real-time updates** when tasks are completed
- **Validation on app open** ensures accuracy

---

**Status**: ✅ Fully Implemented
**Version**: 1.0
**Date**: January 14, 2025

