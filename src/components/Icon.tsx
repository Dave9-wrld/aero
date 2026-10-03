import type { CSSProperties } from "react";

const paths = {
  plane: "M22 2 9 15m13-13-8 20-5-7-7-5 20-8Z",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  chevron: "m9 5 7 7-7 7",
  search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  swap: "M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4",
  calendar:
    "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2",
  user: "M20 21v-2a7 7 0 0 0-14 0v2M17 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  check: "m5 12 4 4L19 6",
  bag: "M5 7h14v14H5V7Zm4 0V4a3 3 0 0 1 6 0v3",
  clock: "M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  close: "m6 6 12 12M6 18 18 6",
  globe:
    "M2 12h20M12 2c6 6 6 14 0 20-6-6-6-14 0-20Zm10 10a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  shield: "M12 2 3 6v6c0 6 9 10 9 10s9-4 9-10V6l-9-4Zm-4 10 3 3 5-5",
  seat: "M7 3v10h10V7M5 17h14m-12 0v4m10-4v4M7 13v4",
  print: "M6 9V3h12v6M6 18H3V9h18v9h-3M6 14h12v8H6v-8Z",
  info: "M12 11v6m0-10h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
} as const;

export default function Icon({
  name,
  size = 20,
  className,
  style,
}: {
  name: keyof typeof paths;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
