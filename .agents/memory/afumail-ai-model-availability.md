---
name: AfuMail AI model availability
description: Engagera model availability constraint for AfuMail's email-assist modes.
---

AfuMail's deployed Engagera account reliably supports `engagera-pro`; `engagera-lite` is not guaranteed to be enabled and can make Smart Reply and Summary fail while Compose still works.

**Why:** Compose previously used Pro while the detail-screen AI features used Lite, creating a misleading partial outage.

**How to apply:** Keep all `ai-assist` email modes on Pro unless the provider account's enabled-model contract is verified first.