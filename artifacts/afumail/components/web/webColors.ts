/**
 * AfuMail Web — Brand Color System
 *
 * The cream palette is the signature of AfuMail on web.
 * Dark navy sidebar is the permanent brand anchor across every view.
 * Blue accent (#2563EB) is the primary brand action color.
 */
export const W = {
  // ─── Sidebar (brand anchor — always dark navy) ───────────────────────
  sidebarBg:          "#0F172A",
  sidebarHover:       "#1E293B",
  sidebarActive:      "#1D3461",
  sidebarBorder:      "#1E293B",
  sidebarText:        "#8DA2B8",
  sidebarTextActive:  "#F1F5F9",
  sidebarSection:     "#4A5A6E",

  // ─── Main backgrounds (cream) ─────────────────────────────────────────
  bg:         "#FAF7F2",  // warm cream — universal app background
  bgCard:     "#FFFFFF",  // elevated white — for rows, modals, inputs
  bgSecondary:"#F3EDE3",  // slightly deeper cream — section separators
  bgHover:    "#EDE6D9",  // hover state on cream
  bgSelected: "#E5EEFF",  // blue-tinted selection — clearly readable on cream
  bgAccentSubtle: "#EEF2FF", // light tint for brand highlights

  // ─── Typography (warm tones on cream) ────────────────────────────────
  textPrimary:   "#1C1208",  // warm near-black
  textSecondary: "#5C4E3A",  // warm brown-gray
  textMuted:     "#9B8B74",  // warm muted

  // ─── Brand accent ─────────────────────────────────────────────────────
  accent:      "#2563EB",
  accentHover: "#1D4ED8",
  accentLight: "#EEF3FF",
  accentText:  "#1E40AF",  // accent on light backgrounds

  // ─── Borders (warm) ──────────────────────────────────────────────────
  border:      "#DDD4C4",
  borderLight: "#EDE8DF",

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
