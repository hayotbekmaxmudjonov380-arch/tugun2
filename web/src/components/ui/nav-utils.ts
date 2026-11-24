export type NavRouteKey =
  | "tuzilma"
  | "dashboard"
  | "tasklar"
  | "davomat"
  | "nizom"
  | "sozlamalar"
  | "qollanma"
  | "login";

export const NAV_ROUTE_KEYS: readonly NavRouteKey[] = [
  "tuzilma",
  "dashboard",
  "tasklar",
  "davomat",
  "nizom",
  "sozlamalar",
  "qollanma",
  "login",
];

/**
 * Maps a location hash (e.g. "#bolim-b2b-sales", "#tasklar", "")
 * to the corresponding topbar navigation index.
 */
export function getActiveNavIndex(hash: string): number {
  const clean = decodeURIComponent((hash || "").replace(/^#/, ""));
  if (!clean || clean.startsWith("bolim-")) return 0;
  const idx = NAV_ROUTE_KEYS.indexOf(clean as NavRouteKey);
  return idx >= 0 ? idx : 0;
}

/**
 * Resolves LiquidNavbar tone ("light" | "dark") from Tugun's root attributes
 * and OS color-scheme preference.
 */
export function resolveNavTone(
  dataMode: string | null,
  dataTheme: string | null,
  prefersDark: boolean
): "light" | "dark" {
  if (dataMode === "night") return "dark";
  if (dataMode === "day") return "light";
  if (dataTheme === "dark") return "dark";
  if (dataTheme === "light") return "light";
  return prefersDark ? "dark" : "light";
}
