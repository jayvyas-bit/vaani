/**
 * Small inline stroke-icon set for the agent builder. Deliberately not an
 * external icon package — this is the handful of glyphs the product needs.
 */
export type IconName =
  | "phone-inbound"
  | "phone-outbound"
  | "shield"
  | "ruler"
  | "book"
  | "wrench"
  | "chevron-down"
  | "chevron-right"
  | "check"
  | "x"
  | "play"
  | "info"
  | "sparkles"
  | "clock"
  | "alert"
  | "plus"
  | "dot"
  | "user"
  | "link"
  | "file"
  | "list"
  | "lock"
  | "flag"
  | "message"
  | "more-vertical"
  | "copy"
  | "trash";

const paths: Record<IconName, string> = {
  "phone-inbound": "M16 2v6h-6 M22 2l-6 6 M2 16.9v2a2 2 0 0 0 2.2 2 19.8 19.8 0 0 0 8.6-3.1 19.5 19.5 0 0 0 6-6 19.8 19.8 0 0 0 3.1-8.7A2 2 0 0 1 20.1 1h2",
  "phone-outbound": "M22 2v6h-6 M16 8l6-6 M2 16.9v2a2 2 0 0 0 2.2 2 19.8 19.8 0 0 0 8.6-3.1 19.5 19.5 0 0 0 6-6 19.8 19.8 0 0 0 3.1-8.7A2 2 0 0 1 20.1 1h2",
  shield: "M12 2 4 5v6c0 5 3.4 8.6 8 11 4.6-2.4 8-6 8-11V5l-8-3Z",
  ruler: "M3 7h18v10H3z M7 7v4 M11 7v4 M15 7v4",
  book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z",
  wrench: "M14.7 6.3a4 4 0 0 1-5.1 5.1L4 18l2 2 6.6-5.6a4 4 0 0 1 5.1-5.1l-3.6 3.6-2-2 3.6-3.6Z",
  "chevron-down": "m6 9 6 6 6-6",
  "chevron-right": "m9 18 6-6-6-6",
  check: "M20 6 9 17l-5-5",
  x: "M18 6 6 18 M6 6l12 12",
  play: "M6 4.5 19 12 6 19.5V4.5Z",
  info: "M12 16v-4 M12 8h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  sparkles:
    "m12 2 1.8 4.9L19 8.7l-5.2 1.8L12 15.4l-1.8-4.9L5 8.7l5.2-1.8L12 2Z M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M12 6v6l4 2",
  alert: "M12 9v4 M12 17h.01 M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  plus: "M12 5v14 M5 12h14",
  dot: "M12 12h.01",
  user: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  link: "M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7 M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z M14 2v6h6 M8 13h8 M8 17h5",
  list: "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
  lock: "M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4",
  flag: "M4 22V4 M4 4h12l-2 4 2 4H4",
  message: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z M8 9h8 M8 13h5",
  "more-vertical": "M12 12h.01 M12 5h.01 M12 19h.01",
  copy: "M9 9h11v11H9z M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1",
  trash: "M4 7h16 M9 7V4h6v3 M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13 M10 11v6 M14 11v6",
};

export function Icon({
  name,
  className = "size-4",
  strokeWidth = 2,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
