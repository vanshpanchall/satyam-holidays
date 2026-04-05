# Backend Quick Start

Use this guide when you only need to run and validate the backend API.
For full-stack setup, use README.md or setup.md at repository root.

## Prerequisites

- Node.js 18 or later
- npm 9 or later
- MongoDB instance (local or Atlas)

## 1. Install Dependencies

From repository root:

```bash
npm --prefix satyam-holidays-backend ci
```

## 2. Configure Environment

Create a local .env file:

```bash
# Linux/macOS
cp satyam-holidays-backend/env.example satyam-holidays-backend/.env

# Windows PowerShell
Copy-Item satyam-holidays-backend/env.example satyam-holidays-backend/.env
```

Minimum required values:

- MONGODB_URI
- JWT_SECRET
- CORS_ORIGIN

Email values for enquiry notifications:

- EMAIL_USER and EMAIL_PASS
  or
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS

For Atlas onboarding details, see MONGODB_SETUP.md.

## 3. Start Backend Server

Development mode:

```bash
npm --prefix satyam-holidays-backend run dev
```

Production-like mode:

```bash
npm --prefix satyam-holidays-backend start
```

Default backend URL:

- http://localhost:5000

Health endpoints:

- http://localhost:5000/api/health
- http://localhost:5000/api/v1/health

## 4. Validate Backend

Run tests:

```bash
npm --prefix satyam-holidays-backend test -- --runInBand
```

Run production verification script (after deployment):

```bash
npm --prefix satyam-holidays-backend run ops:verify-production
```

## 5. Useful Backend Scripts

- npm --prefix satyam-holidays-backend run security:generate-secrets
- npm --prefix satyam-holidays-backend run backup
- npm --prefix satyam-holidays-backend run restore -- ./backups/<file>.tar.gz
- npm --prefix satyam-holidays-backend run rollback

## Troubleshooting

MongoDB connection fails:

- Verify MONGODB_URI format and credentials
- If using Atlas, confirm network access allowlist

Enquiry emails are not sent:

- Confirm SMTP or Gmail app password values
- Check backend logs for transport verification errors

Port 5000 is already in use:

- Change PORT in .env and restart backend

## Related Docs

- ../README.md
- ../setup.md
- ../OPERATIONS_RUNBOOK.md
- MONGODB_SETUP.md
