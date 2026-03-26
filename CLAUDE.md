# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sesny Advisory** — a client portal for tax & accounting services. Clients upload documents and message the firm; admins manage clients, financials, and documents.

## Tech Stack

- **Frontend:** Vanilla JavaScript, HTML5, CSS3 (no framework, no build step)
- **Backend:** Firebase (Firestore, Auth, Storage, Cloud Functions via Node.js)
- **Email:** Nodemailer + Gmail via Cloud Functions
- **Hosting:** Vercel (primary) + Firebase Hosting
- **Security:** Firebase App Check (reCAPTCHA v3), Firestore/Storage rules

## Key Commands

All backend commands run from `/functions/`:

```bash
# Start local Firebase emulator (functions only)
npm run serve

# Deploy functions to production
npm run deploy

# View function logs
npm run logs

# Open Firebase shell
npm run shell
```

Frontend has no build step — edit HTML/JS/CSS directly and deploy via Vercel or `firebase deploy --only hosting`.

## Architecture

### Pages & Their JS Modules

| Page | JS File | Purpose |
|------|---------|---------|
| `dashboard.html` | `dashboard.js` | Admin: client management, GL, forms, financials |
| `portal.html` | `portal.js` | Client: messages, document uploads |
| `financials.js` | (imported by dashboard) | GL entries, period locking, reversal logic |
| `import.js` | (imported by dashboard) | Data import utilities |
| `workspace.js` | (imported by dashboard) | Workspace/tab management |
| `login.html` / `admin.html` | `login.js` | Auth flows |
| `register.html` | `register.js` | Client signup + approval flow |

### Firebase Collections (Firestore)

- `users` — client profiles and approval status
- `messages` — client↔admin messaging threads
- `documents` — file metadata (actual files in Firebase Storage)
- `financials` / GL-related collections — general ledger entries

### Cloud Functions (`functions/index.js`)

Handles email notifications via Nodemailer (Gmail). Triggered on Firestore writes.

### Security

- `firestore.rules` and `storage.rules` enforce access control
- `vercel.json` sets security response headers
- App Check protects against unauthorized API access
- New clients go through an approval flow before gaining portal access
