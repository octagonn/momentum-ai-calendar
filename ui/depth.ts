import type { ViewStyle, TextStyle } from 'react-native';

type ThemeColors = {
  background: string;
  card: string;
  surface: string;
  border: string;
  text: string;
  primary: string;
  primaryLight: string;
};

type Depth = 'sm' | 'md' | 'lg';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const sanitized = hex.replace('#', '');
  if (!(sanitized.length === 3 || sanitized.length === 6)) return null;
  const full = sanitized.length === 3
    ? sanitized.split('').map(c => c + c).join('')
    : sanitized;
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Mixes two colors, weight 0..1 (closer to colorB as weight increases)
function mix(hexA: string, hexB: string, weight: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return hexA;
  const w = clamp(weight, 0, 1);
  const r = a.r * (1 - w) + b.r * w;
  const g = a.g * (1 - w) + b.g * w;
  const bch = a.b * (1 - w) + b.b * w;
  return rgbToHex(r, g, bch);
}

export function lighten(hex: string, amount: number): string {
  return mix(hex, '#ffffff', clamp(amount, 0, 1));
}

export function darken(hex: string, amount: number): string {
  return mix(hex, '#000000', clamp(amount, 0, 1));
}

export function getLayerBackground(colors: ThemeColors, layer: 'page' | 'section' | 'card'): string {
  switch (layer) {
    case 'page':
      return colors.background;
    case 'section':
      return colors.surface;
    case 'card':
    default:
      return colors.card;
  }
}

export function shadow(depth: Depth, isDark: boolean): ViewStyle {
  // Subtle, theme-aware soft shadows
  const commonColor = isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)';
  if (depth === 'sm') {
    return {
      shadowColor: commonColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.15,
      shadowRadius: 4,
      elevation: 2,
    };
  }
  if (depth === 'md') {
    return {
      shadowColor: commonColor,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.28 : 0.18,
      shadowRadius: 10,
      elevation: 6,
    };
  }
  return {
    shadowColor: commonColor,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: isDark ? 0.3 : 0.2,
    shadowRadius: 20,
    elevation: 12,
  };
}

export function shadowSm(isDark: boolean): ViewStyle { return shadow('sm', isDark); }
export function shadowMd(isDark: boolean): ViewStyle { return shadow('md', isDark); }
export function shadowLg(isDark: boolean): ViewStyle { return shadow('lg', isDark); }

// Inset illusion: thin top light, bottom dark lines you can overlay inside a container
export function insetTopLight(colors: ThemeColors, isDark: boolean, opacity: number = 0.08): ViewStyle {
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: isDark ? lighten(colors.card, 0.25) : '#ffffff',
    opacity,
  };
}

export function insetBottomDark(colors: ThemeColors, isDark: boolean, opacity: number = 0.08): ViewStyle {
  return {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: isDark ? '#000000' : darken(colors.card, 0.15),
    opacity,
  };
}

// Simple gradient helpers (use with expo-linear-gradient component)
export function gradientPrimary(colors: ThemeColors): string[] {
  return [colors.primaryLight, colors.primary];
}

export function gradientCardHighlight(colors: ThemeColors, isDark: boolean): string[] {
  // Slight top highlight fading to transparent card color
  const top = isDark ? lighten(colors.card, 0.04) : lighten(colors.card, 0.12);
  return [top, colors.card];
}

export function titleTextShadow(isDark: boolean): TextStyle {
  return isDark
    ? { textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }
    : { textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 };
}

export function pressedStyle(isDark: boolean): ViewStyle {
  return {
    transform: [{ translateY: 1 }],
    opacity: isDark ? 0.95 : 0.98,
  };
}

export function cardBase(colors: ThemeColors, isDark: boolean): ViewStyle {
  return {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 0,
    ...shadowSm(isDark),
  };
}

export function sectionBase(colors: ThemeColors, isDark: boolean): ViewStyle {
  return {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 0,
  };
}

export function pageBase(colors: ThemeColors): ViewStyle {
  return {
    backgroundColor: colors.background,
  };
}


