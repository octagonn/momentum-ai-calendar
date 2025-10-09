// Color palette for goal assignment
export const GOAL_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#EC4899', // Pink
  '#6B7280', // Gray
  '#14B8A6', // Teal
  '#F43F5E', // Rose
  '#A855F7', // Purple
  '#0EA5E9', // Sky
  '#22C55E', // Green
  '#EAB308', // Yellow
] as const;

export type GoalColor = typeof GOAL_COLORS[number];

/**
 * Get the next available color for a user's goals
 * This function should match the database function logic
 */
export function getNextAvailableColor(usedColors: string[]): string {
  const availableColors = GOAL_COLORS.filter(color => !usedColors.includes(color));
  
  if (availableColors.length > 0) {
    return availableColors[0];
  }
  
  // If all colors are used, return the first color
  return GOAL_COLORS[0];
}

/**
 * Get a random color from the palette
 */
export function getRandomColor(): string {
  const randomIndex = Math.floor(Math.random() * GOAL_COLORS.length);
  return GOAL_COLORS[randomIndex];
}

/**
 * Validate if a color is in the allowed palette
 */
export function isValidGoalColor(color: string): boolean {
  return GOAL_COLORS.includes(color as GoalColor);
}

/**
 * Get color name for display purposes
 */
export function getColorName(color: string): string {
  const colorNames: Record<string, string> = {
    '#3B82F6': 'Blue',
    '#10B981': 'Emerald',
    '#F59E0B': 'Amber',
    '#EF4444': 'Red',
    '#8B5CF6': 'Violet',
    '#06B6D4': 'Cyan',
    '#84CC16': 'Lime',
    '#F97316': 'Orange',
    '#EC4899': 'Pink',
    '#6B7280': 'Gray',
    '#14B8A6': 'Teal',
    '#F43F5E': 'Rose',
    '#A855F7': 'Purple',
    '#0EA5E9': 'Sky',
    '#22C55E': 'Green',
    '#EAB308': 'Yellow',
  };
  
  return colorNames[color] || 'Custom';
}
