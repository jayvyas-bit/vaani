import { useCallback, useState } from "react";

/**
 * Controlled when `onChange` is provided (the app lifts state into App.tsx),
 * otherwise falls back to local state so standalone renders (design canvases)
 * stay interactive.
 */
export function useControllable<T>(value: T, onChange?: (next: T) => void): [T, (next: T) => void] {
  const [local, setLocal] = useState(value);
  const controlled = onChange !== undefined;
  const set = useCallback(
    (next: T) => {
      if (onChange) onChange(next);
      else setLocal(next);
    },
    [onChange],
  );
  return [controlled ? value : local, set];
}

export function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function formatRelative(ts: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return "Just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  return new Date(ts).toLocaleDateString();
}
