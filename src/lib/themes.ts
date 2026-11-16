export type ThemePresetId =
  | 'alabaster'
  | 'obsidian'
  | 'midnight'
  | 'sage'
  | 'sand'
  | 'custom';

export interface ThemePreset {
  id: ThemePresetId;
  name: string;
  description: string;
  bgHex: string;
  isDark: boolean;
  accentHex: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'alabaster',
    name: 'Alabaster Daylight',
    description: 'Clean warm-neutral paper canvas',
    bgHex: '#FAF9F7',
    isDark: false,
    accentHex: '#1D4ED8',
  },
  {
    id: 'sand',
    name: 'Warm Sand',
    description: 'Soft editorial parchment tone',
    bgHex: '#F3EDE2',
    isDark: false,
    accentHex: '#0F766E',
  },
  {
    id: 'obsidian',
    name: 'Obsidian Studio',
    description: 'Deep neutral slate for focus',
    bgHex: '#0E1116',
    isDark: true,
    accentHex: '#3B82F6',
  },
  {
    id: 'midnight',
    name: 'Midnight Indigo',
    description: 'Cool deep twilight blue canvas',
    bgHex: '#0B1324',
    isDark: true,
    accentHex: '#60A5FA',
  },
  {
    id: 'sage',
    name: 'Forest Slate',
    description: 'Quiet botanical dark charcoal',
    bgHex: '#0E1916',
    isDark: true,
    accentHex: '#10B981',
  },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  );
}

function mixColors(hexA: string, hexB: string, weightB: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const w = Math.max(0, Math.min(1, weightB));
  return rgbToHex(
    a.r * (1 - w) + b.r * w,
    a.g * (1 - w) + b.g * w,
    a.b * (1 - w) + b.b * w
  );
}

export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const srgb = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

export interface ComputedThemeTokens {
  isDark: boolean;
  canvasBg: string;
  surfaceBg: string;
  surfaceElevated: string;
  surfaceBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentPrimary: string;
  accentFg: string;
  userBubbleBg: string;
  userBubbleFg: string;
}

export function computeThemeTokens(
  presetId: ThemePresetId,
  customHex: string
): ComputedThemeTokens {
  const preset = THEME_PRESETS.find((p) => p.id === presetId);
  const baseHex =
    presetId === 'custom'
      ? /^#[0-9a-fA-F]{6}$/.test(customHex)
        ? customHex
        : '#1E293B'
      : preset?.bgHex || '#FAF9F7';

  const luminance = getRelativeLuminance(baseHex);
  const isDark = luminance < 0.35;

  const surfaceBg = isDark
    ? mixColors(baseHex, '#FFFFFF', 0.05)
    : mixColors(baseHex, '#000000', 0.04);

  const surfaceElevated = isDark
    ? mixColors(baseHex, '#FFFFFF', 0.085)
    : mixColors(baseHex, '#FFFFFF', 0.72);

  const surfaceBorder = isDark
    ? 'rgba(255, 255, 255, 0.11)'
    : 'rgba(15, 23, 42, 0.11)';

  const textPrimary = isDark ? '#F3F4F6' : '#111827';
  const textSecondary = isDark ? '#B8C1CE' : '#4B5563';
  const textMuted = isDark ? '#8B95A5' : '#6B7280';

  const accentPrimary =
    preset?.accentHex || (isDark ? '#3B82F6' : '#1D4ED8');

  return {
    isDark,
    canvasBg: baseHex,
    surfaceBg,
    surfaceElevated,
    surfaceBorder,
    textPrimary,
    textSecondary,
    textMuted,
    accentPrimary,
    accentFg: '#FFFFFF',
    userBubbleBg: isDark ? mixColors(baseHex, '#FFFFFF', 0.12) : '#1E293B',
    userBubbleFg: '#F8FAFC',
  };
}

export function applyThemeToDocument(
  presetId: ThemePresetId,
  customHex: string
): ComputedThemeTokens {
  const tokens = computeThemeTokens(presetId, customHex);
  const root = document.documentElement;
  root.classList.toggle('dark', tokens.isDark);
  root.style.setProperty('--canvas-bg', tokens.canvasBg);
  root.style.setProperty('--surface-bg', tokens.surfaceBg);
  root.style.setProperty('--surface-elevated', tokens.surfaceElevated);
  root.style.setProperty('--surface-border', tokens.surfaceBorder);
  root.style.setProperty('--text-primary', tokens.textPrimary);
  root.style.setProperty('--text-secondary', tokens.textSecondary);
  root.style.setProperty('--text-muted', tokens.textMuted);
  root.style.setProperty('--accent-primary', tokens.accentPrimary);
  root.style.setProperty('--accent-fg', tokens.accentFg);
  root.style.setProperty('--user-bubble-bg', tokens.userBubbleBg);
  root.style.setProperty('--user-bubble-fg', tokens.userBubbleFg);
  return tokens;
}
