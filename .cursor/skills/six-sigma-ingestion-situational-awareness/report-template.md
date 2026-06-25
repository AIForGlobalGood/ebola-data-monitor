# Six Sigma Validation Report — [Project Name]

**Archetype:** Ingestion situational awareness  
**Date:** YYYY-MM-DD  
**Validator:** [agent / person]  
**Environments:** local · production  
**Verdict:** ☐ Pass · ☐ Conditional pass · ☐ Fail

---

## Executive summary

[2–4 sentences: operator impact, 🔴 count, release recommendation]

---

## DEFINE — CTQ map

| CTQ | Requirement | Evidence source |
|-----|-------------|-----------------|
| Lane separation | | |
| Freshness | | |
| Count consistency | | |
| Retention policy | | |
| Source failure visibility | | |
| Deploy parity | | |
| Disclaimer honesty | | |

**Scope boundary (from docs):**

- In scope:
- Out of scope:

---

## MEASURE — baseline

### Environment

| Surface | Status | Notes |
|---------|--------|-------|
| Local backend | | |
| Local frontend | | |
| Production | | |
| Database | | |

### Pipeline run

| Step | Command | HTTP | Duration | Notes |
|------|---------|------|----------|-------|
| fetch-all | | | | |
| reprocess | | | | |
| tower | | | | |
| feed | | | | |

### Metric cross-check

| Metric | Location A | Location B | Match? |
|--------|------------|------------|--------|
| Total indexed | | | |
| Matched signals | | | |
| Official cumulative | | | |
| Import/media signals | | | |

### Retention sample (n=10)

| id/title | published_at | passes cutoff? |
|----------|--------------|----------------|
| | | |

### Lane separation sample

| Item | Lane shown | Actual tier/parser | Correct? |
|------|------------|-------------------|----------|
| | | | |

---

## ANALYZE — defect register

| ID | Severity | CTQ | Symptom | Root cause | Evidence |
|----|----------|-----|---------|------------|----------|
| D1 | 🔴/🟠/🟡 | | | | |

### 5 Whys (critical/major only)

**D1:**
1. Why …
2. Why …
3. Why …
4. Why …
5. Why …

---

## IMPROVE — action plan

| ID | Action | Owner | Verification | Status |
|----|--------|-------|--------------|--------|
| | | | | |

---

## CONTROL — ongoing gates

| Gate | Frequency | Pass criteria | Automated? |
|------|-----------|---------------|------------|
| Smoke | post-deploy | | |
| Ingest | | | |
| Retention | | | |
| Lane audit | | | |

---

## Appendix

- Checklist completion: __ / __ items passed
- Files reviewed:
- Commands log:
