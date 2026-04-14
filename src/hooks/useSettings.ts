import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "phosphor:settings:v1";

export interface Settings {
  smoothScroll: boolean;
}

const DEFAULTS: Settings = {
  smoothScroll: false,
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* storage unavailable — fine */
    }
  }, [settings]);

  const toggleSmoothScroll = useCallback(() => {
    setSettings((s) => ({ ...s, smoothScroll: !s.smoothScroll }));
  }, []);

  return { settings, toggleSmoothScroll };
}
