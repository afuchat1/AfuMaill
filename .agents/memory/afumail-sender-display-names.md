---
name: AfuMail sender display names
description: Rules for presenting sender names from internal AfuChat and external email addresses
---

Internal `@afuchat.com` sender addresses should display the current `profiles.full_name` for that mailbox. If no profile name is available, use `AfuChat` rather than the mailbox local part.

External addresses with no meaningful display name should use a recognizable domain brand when known, such as Gmail, Outlook, Yahoo, or iCloud. Preserve a real RFC display name when the incoming address includes one.

**Why:** Showing `hello` or `user` as a sender name makes company mail look like a personal mailbox and hides the identity AfuChat users chose for their profile.

**How to apply:** Resolve internal names through the privacy-scoped sender-name RPC for addresses visible in the current user's mailbox; preserve provider `From` header names for external mail; keep parsing and presentation centralized in the email row mapper so search and detail views stay consistent. There is no universal external profile directory to query without a provider-specific integration.