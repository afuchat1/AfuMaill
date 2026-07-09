---
name: AfuMail inbound email body should stay HTML
description: Why receive-email must store real HTML instead of flattening to plain text.
---

## Rule
`receive-email` stores `htmlBody || textBody` as the email's `body` (raw HTML preferred), never a plain-text flattening of HTML. Only the `preview` field uses `htmlToText()`.

**Why:** Marketing/transactional emails are often image- and layout-heavy with little or no real text content outside of a footer/unsubscribe line. Converting HTML to plain text before storage discarded all of that, leaving the mail body looking blank or showing only a stray fragment (e.g. just the recipient address from an unsubscribe footer). The mobile/web client (`EmailDetailPanel.tsx`) already detects HTML bodies (`/^\s*</.test(body)`) and renders them in a WebView, so storing real HTML uses a capability that already existed but was unused.

**How to apply:** If email bodies ever look empty/truncated again, check whether `receive-email` regressed to flattening HTML before storage — that's the recurring failure mode here. Emails ingested before this fix keep their flattened (and effectively lossy) plain-text body; there's no automatic backfill.
