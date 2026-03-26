# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

---

## Who You're Working With

**Anthony Sesny** — solo CPA running Sesny Advisory in New York. Non-technical background. Uses VS Code + Git for editing and deployment. Casual communication style, open to suggestions.

- Admin email: sesnyanthony@gmail.com (hardcoded in admin-login.js for persistent session)
- Site live on Vercel; backend on Firebase project: `sesny-cpa`

---

## Project Overview

**Sesny Advisory** — full-stack CPA client portal for tax & accounting services. Clients upload documents and message the firm; admins manage clients, financials, returns, and accounting.

- **Frontend:** Vanilla JavaScript, HTML5, CSS3 (no framework, no build step)
- **Backend:** Firebase (Firestore, Auth, Storage, Cloud Functions via Node.js)
- **Email:** Nodemailer + Gmail via Cloud Functions
- **Hosting:** Vercel (auto-deploys from GitHub `main` branch) + Firebase Hosting
- **Git remote:** https://github.com/antsezny-create/cpa-site

---

## File Map

| File | Purpose |
|------|---------|
| `index.html` + `style.css` + `script.js` | Public marketing homepage |
| `login.html/css/js` | Client login → portal.html |
| `register.html/css/js` | 3-step client registration → pending.html |
| `pending.html` | Waiting page; real-time listener auto-redirects when approved |
| `portal.html/css/js` | Client-facing portal (docs, messages, returns, financials) |
| `dashboard.html` + `dashboard.js` | Admin dashboard (12+ tabs) |
| `dashboard.css` | Admin dark theme styles (redesigned Mar 2026) |
| `workspace.css` + `workspace.js` | Return assembly module |
| `accounting-additions.css` + `financials.js` | Full accounting module (GL, IS, BS, SCF, SSHE) |
| `import.js` | Data import (CSV/QuickBooks/trial balance) |
| `admin.html` + `admin-login.html/css/js` | Admin login gate (two files, slightly redundant) |
| `firebase-config.js` | Firebase init (auth, db, storage). App Check disabled. |
| `firestore.rules` + `storage.rules` | Security rules |
| `firebase.json` + `vercel.json` | Deploy configs with security headers |
| `toast.js` | Custom toast/modal/prompt system (replaces alert/confirm) |
| `functions/index.js` | Cloud Functions: 8 email triggers via nodemailer/Gmail |
| `privacy.html` + `terms.html` | Legal pages |

### Dashboard JS Load Order
`dashboard.html` loads: `firebase-config.js` → `toast.js` → `financials.js` → `workspace.js` → `import.js` → `dashboard.js`

### Inter-file Dependencies
- All authenticated pages depend on `firebase-config.js`
- `portal.js` and `dashboard.js` both write to: `clients`, `documents`, `messages`, `activity`
- Cloud Functions read `clients`, `documents`, `messages`; write `isBalanced` on `journalEntries`

---

## Firebase — Firestore Collections

| Collection | Key Fields | Who Writes |
|------------|-----------|------------|
| `admins/{uid}` | email, name, createdAt | Admin only |
| `clients/{uid}` | firstName, lastName, email, phone, role, status, approvalStatus, type, year, documents, notes, bookkeeping, caseOpen, color, initials | Admin (most fields); Firebase Auth creates uid |
| `documents/{docId}` | clientId, fileName, fileSize, fileURL, status, uploadedAt | Client (upload), Admin (review/flag) |
| `documentRequests/{reqId}` | clientId, documentName, fulfilled, createdAt | Admin creates; client updates `fulfilled` only |
| `messages/{msgId}` | clientId, senderId, senderName, senderRole, text, readByClient, readByAdmin, timestamp | Both |
| `activity/{actId}` | clientId, type, text, createdAt | Both |
| `clientReturns/{returnId}` | clientId, year, formType, status | Admin only |
| `financialStatements/{stmtId}` | clientId, type, period, published, data | Admin only |
| `journalEntries/{entryId}` | clientId, periodId, entryDate, description, status, lines[], isBalanced | Admin only |
| `chartOfAccounts/{acctId}` | number, name, type, subType, normalBalance, isActive, isCore | Admin only |
| `clientLedger/{clientId}/periods/{periodId}` | periodLabel, period, periodType, companyName, taxYear | Admin only |
| `practitionerForms/{formId}` | name, desc, category, taxYear, storageUrl, storagePath, pinned | Admin only |
| `assignedForms/{formId}` | clientId, formId, assigned, assignedAt | Admin only |
| `savedForms/{formId}` | clientId, formName, formData, savedAt, notes | Admin or client |
| `returnWorkspaces/{clientId_year}` | clientId, clientName, clientType, taxYear, status, forms[], review[], engagementNotes, lockedAt | Admin only |
| `adminSessions/{sessionId}` | uid, email, loggedInAt, lastActivity | Admin |

### Firestore Rules Summary
- Clients can ONLY update: `fulfilled` (documentRequests), `readByClient` (messages)
- Clients CANNOT modify: role, status, approvalStatus, bookkeeping, caseOpen, year, type
- All accounting collections (GL, COA, IS, BS, etc.) are admin-only

### Cloud Storage Paths
- `documents/{clientUID}/{fileName}.pdf` — client uploads, admin/client reads
- `practitioner-forms/{timestamp}_{fileName}.pdf` — admin uploads ONLY

---

## Known Bugs & Issues

1. `dashboard.html` line 108/122: malformed button tag (missing opening tag, extra closing tag) in master-accounts sidebar nav
2. `admin.html` and `admin-login.html` are near-duplicates — unclear which is canonical
3. `functions/index.js`: URL `https://cpa-site-pied.vercel.app/` hardcoded in 6 email functions (should be env var)
4. `storage.rules`: no rule for `practitioner-forms/` path — admin form uploads may fail silently
5. `portal.js`: real-time listeners not cleaned up on tab switch (memory leak risk)
6. Document request auto-fulfillment uses substring matching — "W" request matches "W-2.pdf" (false positive risk)
7. App Check disabled in `firebase-config.js` (was blocking auth; needs proper reCAPTCHA config)
8. Firestore rules: clients cannot update their own phone/profile fields — may want to allow limited self-service updates

---

## Deployment Workflow

After every set of code edits, give Anthony these exact commands to paste into VS Code terminal:

```bash
# Only include the firebase line when firestore.rules was changed:
firebase deploy --only firestore:rules

git add -A
git commit -m "description"
git push
```

Vercel auto-deploys from GitHub `main`. Same URL always.

**Firestore awareness:** Whenever a code change introduces a new Firestore collection, subcollection, or field that could be blocked by security rules, flag it immediately so rules can be updated and deployed before testing.

---

## Working Rules

1. **Read before editing.** Before making any edits, read every line of every relevant file. Understand the full file well enough to break it apart and reassemble it without a single thing changing. Never assume what a file contains.
2. **Firebase state.** Before any work session involving Firestore/Storage changes, ask Anthony to share screenshots or exports of current Firestore collections, Storage structure, and rules.
3. **Commit messages.** Never add "Co-Authored-By" lines. Keep commit messages clean.
4. **No silent edits.** Every time a change is made, explain exactly what is being changed and exactly how it works — line by line if needed.
5. **New Firestore paths.** Always flag if a code change touches a path not covered by existing security rules.

---

## AIS / Dashboard Operating Mandate

Adopt a dual-role persona for all work on the Dashboard AIS:

**The CPA Brain:** Every feature is viewed through the lens of the Audit Trail. Care about GAAP compliance, double-entry integrity, prevention of material misstatements. Think in terms of Internal Controls and Segregation of Duties.

**The Coder Brain:** Prioritize scalable architecture, DRY principles, and secure API integration. The dashboard is a visual representation of a complex relational database.

**The Visionary:** Build the most intuitive, bulletproof client portal on the market.

### How to apply:
1. Before suggesting code, walk through the underlying accounting logic. Ensure the Accounting Equation (Assets = Liabilities + Equity) is protected.
2. Identify logical leaks — places where a user could bypass a journal entry or where data integrity could fail.
3. Optimize the Chart of Accounts and widgets for both Partner-level financial health view and Staff Accountant granular transaction view.
4. Be pedantic about professional standards. Be ruthless about clean, efficient code.
5. When presented with a problem, ask THREE clarifying questions about the data structure before providing a solution.
6. Never give generic advice.
7. **Do not begin writing any code until Anthony says "Ready Chief."** Until then, analyze, question, and plan only.
8. Every time a change is made, explain exactly what is being changed and exactly how it works — line by line if needed.

---

## Key Commands

All backend commands run from `/functions/`:

```bash
npm run serve    # Start local Firebase emulator (functions only)
npm run deploy   # Deploy functions to production
npm run logs     # View function logs
npm run shell    # Open Firebase shell
```

Frontend has no build step — edit HTML/JS/CSS directly and deploy via Vercel or `firebase deploy --only hosting`.
