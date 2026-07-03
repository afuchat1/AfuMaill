/**
 * AfuMail Web — Brand Color System
 *
 * Clean, flat, light design. No dark panels.
 * Blue accent (#2563EB) is the primary brand action color.
 */
export const W = {
  // ─── Sidebar — light, flat, white ────────────────────────────────────
  sidebarBg:          "#FFFFFF",
  sidebarHover:       "#F5F5F7",
  sidebarActive:      "#EEF2FF",
  sidebarBorder:      "#F0F0F2",
  sidebarText:        "#6B7280",
  sidebarTextActive:  "#111827",
  sidebarSection:     "#B0B8C4",

  // ─── Main backgrounds ─────────────────────────────────────────────────
  bg:             "#F6F7F9",
  bgCard:         "#FFFFFF",
  bgSecondary:    "#F0F2F5",
  bgHover:        "#ECEEF2",
  bgSelected:     "#EEF2FF",
  bgAccentSubtle: "#EEF2FF",

  // ─── Typography ───────────────────────────────────────────────────────
  textPrimary:   "#111827",
  textSecondary: "#4B5563",
  textMuted:     "#9CA3AF",

  // ─── Brand accent ─────────────────────────────────────────────────────
  accent:      "#2563EB",
  accentHover: "#1D4ED8",
  accentLight: "#EEF2FF",
  accentText:  "#1E40AF",

  // ─── Borders — very subtle, used sparingly ────────────────────────────
  border:      "#E8EAED",
  borderLight: "#F0F2F5",

  // ─── Status ───────────────────────────────────────────────────────────
  destructive:      "#DC2626",
  destructiveLight: "#FEF2F2",
  destructiveText:  "#991B1B",
  success:          "#059669",
  successLight:     "#ECFDF5",
  warning:          "#D97706",
  warningLight:     "#FFFBEB",

  // ─── Brand constants ──────────────────────────────────────────────────
  brandName:    "AfuMail",
  brandDomain:  "mail.afuchat.com",
  brandTagline: "Afu Ecosystem",
};

export type WColors = typeof W;
