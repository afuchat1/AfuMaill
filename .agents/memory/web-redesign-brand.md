---
name: AfuMail Web Redesign — Brand & Color System
description: Cream palette, brand identity rules, and panel architecture for the AfuMail web redesign
---

## Brand color system
All web colors are centralized in `artifacts/afumail/components/web/webColors.ts` and exported as `const W`.

Key values:
- Main BG: `#FAF7F2` (warm cream — universal app background)
- Card/elevated: `#FFFFFF`
- Sidebar: `#0F172A` dark navy (permanent brand anchor)
- Accent: `#2563EB`
- Text primary: `#1C1208` (warm near-black, NOT pure #000 or #0F172A)
- Border: `#DDD4C4` (warm beige)

**Why:** User specified cream as the brand background. The dark navy sidebar is the fixed brand anchor visible in all states.

## Navigation architecture
`CurrentView` type in `WebSidebar.tsx` covers both email folders AND account views:
- Mail: `inbox | starred | sent | drafts | archived | spam | trash`
- Account: `profile | security | sessions`

`index.web.tsx` uses `isMailView()` to switch between 3-column mail layout and full-width account panels.

**Why:** AfuMail is an identity platform, not just email — the sidebar must surface account/security navigation.

## Account panels
- `WebAccountPanel.tsx` — profile editing using real supabase functions (savePhoneNumber, saveNotificationEmail, saveSignature, saveVacationReply)
- `WebSecurityPanel.tsx` — 3-tab panel (overview, password, sessions) using setNewPassword; sessions use navigator.userAgent for current device detection

## Import convention
All web components import colors from `"./webColors"` (sibling import).
Pages import from `"@/components/web/webColors"` (alias import).
