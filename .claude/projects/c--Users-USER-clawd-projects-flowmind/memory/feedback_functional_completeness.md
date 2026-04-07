---
name: functional-completeness-loop
description: User wants automatic functional completeness checks - not just code/type errors but "does every button actually work" validation
type: feedback
---

Every session, before declaring work "done", trace every UI feature from user perspective:
- For each button/action: what happens when clicked? Does it call a real endpoint? Does the endpoint do something? Does the result appear in UI?
- For each list/view: what happens with 0 items? 100+ items? Is there search/filter?
- For each form: does submit work? Does validation exist? Does the result persist?

**Why:** User found multiple "feature gaps" that code scanning can't detect - functions that exist but are empty stubs, buttons that call endpoints that don't save data, UIs that work for 10 items but break at 100+. These aren't type errors or runtime crashes - they're incomplete feature wiring.

**How to apply:** After implementing changes, mentally walk through each affected feature as a user would. Check: "If I click this, does something actually happen end-to-end?" Don't just verify tsc passes - verify the feature chain: UI → API → DB → Response → UI update.
