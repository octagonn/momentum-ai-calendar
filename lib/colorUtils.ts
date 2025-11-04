// Color palette for goal assignment
export const GOAL_COLORS = [
  '#A855F7', // Purple (brand)
  '#C084FC', // Purple Light
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#3B82F6', // Blue
  '#0EA5E9', // Sky
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#22C55E', // Green
  '#84CC16', // Lime
  '#F59E0B', // Amber
  '#EAB308', // Yellow
  '#F97316', // Orange
  '#EF4444', // Red
  '#F43F5E', // Rose
  '#6B7280', // Gray
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
    '#A855F7': 'Purple',
    '#C084FC': 'Purple Light',
    '#8B5CF6': 'Violet',
    '#EC4899': 'Pink',
    '#3B82F6': 'Blue',
    '#0EA5E9': 'Sky',
    '#06B6D4': 'Cyan',
    '#10B981': 'Emerald',
    '#22C55E': 'Green',
    '#84CC16': 'Lime',
    '#F59E0B': 'Amber',
    '#EAB308': 'Yellow',
    '#F97316': 'Orange',
    '#EF4444': 'Red',
    '#F43F5E': 'Rose',
    '#6B7280': 'Gray',
  };
  
  return colorNames[color] || 'Custom';
}
