---
name: release-brief-auditor
description: Audit a release brief before publishing. Use when the user asks for a release brief review, pre-publication content check, or explicitly invokes release-brief-auditor.
---

# Release Brief Auditor

Audit the requested brief without changing project files or fetching remote content.

1. Read `references/editorial-checklist.md`.
2. Run `node scripts/audit-brief.mjs <brief-path>` to collect deterministic counts.
3. Apply every checklist item to the brief.
4. Return a concise Chinese verdict with the three highest-value fixes.

Do not claim that a checklist item passed unless the brief contains supporting text. Keep script code and unrelated skill files out of the response; use only the script's output.
