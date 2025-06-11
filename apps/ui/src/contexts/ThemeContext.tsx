import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';

// -----------------------------
// Types & Constants
// -----------------------------

export type ThemeMode = 'light' | 'dark';

export const TOKENS = [
  '--bg-primary',
  '--bg-secondary',
  '--border',
  '--text-primary',
  '--text-secondary',
  '--text-muted',
] as const;
export type TokenName = (typeof TOKENS)[number];

export interface ThemePreset {
  light: Record<TokenName, string>;
  dark: Record<TokenName, string>;
}

interface ThemeContextValue {
  // Current light/dark mode
  mode: ThemeMode;
  toggleMode: () => void;

  // Current preset name & all presets
  presetName: string;
  setPresetName: (name: string) => void;
  presets: Record<string, ThemePreset>;

  // Editing utilities
  updateToken: (token: TokenName, value: string) => void; // Update token for current mode in current preset
  savePresetAs: (name: string) => void; // Duplicate current preset under a new name & switch to it
}

// -----------------------------
// Defaults
// -----------------------------

const defaultPreset: ThemePreset = {
  light: {
    '--bg-primary': '#f5f5f4',
    '--bg-secondary': '#fafaf9',
    '--border': '#d6d3d1',
    '--text-primary': '#1c1917',
    '--text-secondary': '#3f3f3f',
    '--text-muted': '#57534e',
  },
  dark: {
    '--bg-primary': '#292524',
    '--bg-secondary': '#1c1917',
    '--border': '#44403c',
    '--text-primary': '#fafaf9',
    '--text-secondary': '#d6d3d1',
    '--text-muted': '#d6d3d1',
  },
};

// -----------------------------
// Local-storage keys
// -----------------------------

const STORAGE_KEYS = {
  PRESETS: 'themePresets',
  CURRENT_PRESET: 'currentThemePreset',
  MODE: 'theme',
} as const;

// -----------------------------
// Context implementation
// -----------------------------

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Presets -----------------------------------------------------------
  const [presets, setPresets] = useState<Record<string, ThemePreset>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.PRESETS);
        if (stored) {
          return { default: defaultPreset, ...JSON.parse(stored) };
        }
      } catch {
        // JSON malformed – ignore
      }
    }
    return { default: defaultPreset };
  });

  // Mode (light/dark) ------------------------------------------------
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEYS.MODE);
      if (stored === 'light' || stored === 'dark') return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Current preset name ---------------------------------------------
  const [presetName, setPresetNameState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_PRESET);
      if (stored) return stored;
    }
    return 'default';
  });

  // Sync <html> class for mode --------------------------------------
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEYS.MODE, mode);
  }, [mode]);

  // Apply variables of current preset to DOM -------------------------
  useLayoutEffect(() => {
    const root = document.documentElement;
    const activePreset = presets[presetName] ?? defaultPreset;
    const vars = activePreset[mode];
    for (const token of TOKENS) {
      root.style.setProperty(token, vars[token]);
    }
  }, [presetName, presets, mode]);

  // Persist presets (excluding default) ------------------------------
  useEffect(() => {
    const { default: _default, ...rest } = presets;
    try {
      localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(rest));
    } catch {
      // ignore quota / JSON errors
    }
  }, [presets]);

  // Ensure current preset exists ------------------------------------
  useEffect(() => {
    if (!presets[presetName]) {
      setPresetNameState('default');
    }
  }, [presetName, presets]);

  // --------------------------------------------------------------
  // Action helpers
  // --------------------------------------------------------------

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setPresetName = useCallback(
    (name: string) => {
      if (!presets[name]) return;
      setPresetNameState(name);
      localStorage.setItem(STORAGE_KEYS.CURRENT_PRESET, name);
    },
    [presets]
  );

  const updateToken = useCallback(
    (token: TokenName, value: string) => {
      setPresets((prev) => ({
        ...prev,
        [presetName]: {
          ...prev[presetName],
          [mode]: {
            ...prev[presetName][mode],
            [token]: value,
          },
        },
      }));
    },
    [presetName, mode]
  );

  const savePresetAs = useCallback(
    (name: string) => {
      if (!name.trim() || presets[name]) return; // avoid duplicates / empties
      setPresets((prev) => ({
        ...prev,
        [name]: JSON.parse(JSON.stringify(prev[presetName])), // deep clone
      }));
      setPresetNameState(name);
      localStorage.setItem(STORAGE_KEYS.CURRENT_PRESET, name);
    },
    [presetName, presets]
  );

  // --------------------------------------------------------------
  // Provider value
  // --------------------------------------------------------------

  const ctx: ThemeContextValue = {
    mode,
    toggleMode,
    presetName,
    setPresetName,
    presets,
    updateToken,
    savePresetAs,
  };

  return <ThemeContext.Provider value={ctx}>{children}</ThemeContext.Provider>;
}

// Hook ---------------------------------------------------------------
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
