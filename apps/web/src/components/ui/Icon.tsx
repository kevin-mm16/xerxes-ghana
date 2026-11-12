import type { SVGProps } from "react";

const paths: Record<string, string> = {
  "arrow-right": "M4 12h16m-6-6 6 6-6 6",
  "arrow-left": "M20 12H4m6-6-6 6 6 6",
  "arrow-up-right": "M6 18 18 6M6 6h12v12",
  "chevron-right": "m9 5 7 7-7 7",
  "chevron-left": "m15 5-7 7 7 7",
  "chevron-down": "m5 9 7 7 7-7",
  check: "m5 12 4 4L19 6",
  x: "m6 6 12 12M6 18 18 6",
  menu: "M4 6h16M4 12h16M4 18h16",
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  layers: "m12 3 10 5-10 5L2 8l10-5Zm-9 9 9 5 9-5M3 16l9 5 9-5",
  filter: "M4 5h16l-6 7v7l-4-2v-5L4 5Z",
  crosshair: "M12 2v4m0 12v4M2 12h4m12 0h4M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  "map-pin":
    "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  map: "m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16",
  upload: "M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5",
  file: "M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 13h8m-8 4h6",
  image: "M3 3h18v18H3V3Zm0 14 6-6 4 4 3-3 5 5M9 7h.01",
  video: "M3 5h14v14H3V5Zm14 5 5-3v10l-5-3",
  play: "m8 4 12 8-12 8V4Z",
  pause: "M7 4v16M17 4v16",
  shield: "m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Zm-4 10 3 3 5-6",
  alert: "m12 3 10 18H2L12 3Zm0 6v5m0 3h.01",
  info: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Zm-10-1v6m0-10h.01",
  clock: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 6v6l4 2",
  globe:
    "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM2 12h20M12 2c5 5 5 15 0 20-5-5-5-15 0-20Z",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  grid: "M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  refresh: "M20 7V2m0 5h-5m5 0a9 9 0 1 0 1 9",
  lock: "M5 10h14v12H5V10Zm3 0V6a4 4 0 1 1 8 0v4m-4 5v3",
  plus: "M12 4v16M4 12h16",
  minus: "M4 12h16",
};

export function Icon({
  name,
  className = "",
  ...props
}: SVGProps<SVGSVGElement> & { name: string }) {
  const normalized = name.replace(
    /[A-Z]/g,
    (letter) => `-${letter.toLowerCase()}`,
  );
  const aliases: Record<string, string> = {
    location: "map-pin",
    locate: "crosshair",
    close: "x",
    "external-link": "arrow-up-right",
    "check-circle": "shield",
    "alert-circle": "alert",
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
      {...props}
    >
      <path d={paths[aliases[normalized] ?? normalized] ?? paths.file} />
    </svg>
  );
}
