---
name: six-sigma-findings-to-bugs
description: >-
  Converts Six Sigma validation defect registers into structured bug tickets,
  then drives remediation and verification. Use after six-sigma-ingestion-situational-awareness
  (or any DMAIC report with a defect register), when the user asks to file bugs,
  generate bug text from findings, or fix validation defects.
---

# Six Sigma Findings → Bugs → Remediation

Companion to **`six-sigma-ingestion-situational-awareness`**. Turns defect rows (D1, D2, …) into actionable bug tickets, then fixes them in priority order.

## When to run

- A validation report exists (`docs/quality/six-sigma-validation-*.md` or `experiments/…`)
- User asks to **generate bugs**, **remediate findings**, or **fix validation defects**
- Release gate failed with documented D-IDs

## Workflow

```
- [ ] 1. Load latest validation report (defect register + action plan)
- [ ] 2. Generate bug tickets file (one section per finding)
- [ ] 3. Triage: code-fix vs operator vs wont-fix
- [ ] 4. Remediate in severity order (🔴 → 🟠 → 🟡)
- [ ] 5. Verify each fix (command or UI check from ticket)
- [ ] 6. Update bug statuses + validation report action plan
- [ ] 7. Commit code fixes (one commit or logical grouping)
```

## Step 1 — Load findings

Read the newest `six-sigma-validation-*.md`. Extract rows from **ANALYZE — defect register** and **IMPROVE — action plan**.

Skip 🟢 observations unless the user asks to track them.

## Step 2 — Generate bug tickets

Write `docs/quality/bugs-YYYY-MM-DD.md` using the template below **for every defect ID**.

### Bug ticket template (repeat per finding)

```markdown
## [D{id}] {short title}

| Field | Value |
|-------|-------|
| **Severity** | 🔴 Critical / 🟠 Major / 🟡 Minor |
| **CTQ** | {from register} |
| **Status** | Open / In progress / Fixed / Operator / Wont fix |
| **Type** | code · config · ux · ops |

### Summary
{One sentence operator impact}

### Steps to reproduce
1. …
2. …

### Expected
…

### Actual
…

### Root cause
…

### Fix approach
- [ ] {concrete task}
- [ ] Verification: `{command or check}`

### Files likely touched
- `path/…`
```

**Title rules:** Verb-first, specific (`Require CRON_SECRET on Vercel`, not `Fix cron`).

## Step 3 — Triage types

| Type | Action |
|------|--------|
| **code** | Implement in repo; verify; commit |
| **config** | Document + script; add startup guard if possible; operator runs env setup |
| **ux** | Frontend copy/structure only |
| **ops** | Cannot fully fix in code — mark **Operator**, add runbook step |

D1 (Turso not on Vercel) is often **config + code guard** (warn/fail loudly), not fully code-fixable without credentials.

## Step 4 — Remediate

Order: all 🔴, then 🟠, then 🟡 requested by user.

Per bug:
1. Implement minimal fix (match project conventions)
2. Run verification from ticket
3. Set status **Fixed** or **Operator** with notes

Do not close **Operator** bugs as **Fixed** without evidence env is set.

## Step 5 — Update artifacts

- Set `Status` on each bug in `bugs-YYYY-MM-DD.md`
- Update validation report **IMPROVE** table statuses
- If verdict changes, note in validation report header

## Step 6 — Commit

Commit when user asks or after remediation batch:

```
fix(quality): remediate six-sigma findings D2, D3, D4, D5

- …
```

Exclude `bugs-*.md` and validation updates unless user wants docs in commit (include by default for traceability).

## Severity → default disposition

| Severity | Default |
|----------|---------|
| 🔴 | Must code-fix or block release |
| 🟠 | Code-fix or hard guard + operator runbook |
| 🟡 | Code-fix if ≤1 day; else document workaround |
| 🟢 | Optional backlog item only |

## Example invocation

> "Generate bugs from the latest six-sigma validation and fix what you can."

→ Load `docs/quality/six-sigma-validation-2026-06-25.md`  
→ Write `docs/quality/bugs-2026-06-25.md`  
→ Fix D2/D4/D5 in code; D1/D2 partial env guards; D6/D7 wont-fix/operator  
→ Commit

## Series note

Part of the **Six Sigma skill family**:
- `six-sigma-ingestion-situational-awareness` — audit
- `six-sigma-findings-to-bugs` — tickets + remediation (this skill)

Other archetypes get their own pair when added.
