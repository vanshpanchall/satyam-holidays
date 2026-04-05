# Satyam Holidays Monorepo

Production-focused monorepo for the Satyam Holidays platform, including:
- A React frontend for public browsing, package discovery, and enquiries
- A Node.js/Express backend API with MongoDB, security middleware, and ops tooling
- Optional local monitoring stack for Prometheus, Alertmanager, and Uptime Kuma

This repository is structured for local development, CI quality gates, and Vercel-based deployment.

## Repository Layout

```text
satyam-holidays/
|- satyam-holidays-react/          Frontend app (React)
|- satyam-holidays-backend/        Backend API (Express + MongoDB)
|- monitoring/                     Prometheus and Alertmanager configs
|- infra/nginx/                    Self-hosted load balancer fallback config
|- .github/workflows/ci.yml        CI quality gate workflow
|- docker-compose.yml              Local app stack (Mongo, Redis, backend, frontend)
|- docker-compose.monitoring.yml   Optional monitoring stack
```

## Core Capabilities

### Frontend
- Responsive travel website with package listing and category views
- Enquiry and contact flows with API integration
- Production build pipeline with Lighthouse performance gate

### Backend
- REST API for packages, enquiries, reviews, auth, and settings
- MongoDB persistence with Mongoose models
- Security baseline: Helmet, rate limiting, sanitize, HPP, CORS controls
- Optional Redis cache integration
- Production verification and backup/restore/rollback scripts

## Tech Stack

- Frontend: React 18, Tailwind CSS, Framer Motion
- Backend: Node.js, Express, Mongoose, Joi, Winston
- Data services: MongoDB, optional Redis
- Observability: Sentry, Prometheus, Alertmanager, Uptime Kuma
- CI/CD: GitHub Actions quality gate plus Vercel deployments

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB (local or Atlas)
- Optional: Docker Desktop (for compose-based local stack)

## Local Development

### 1. Install Dependencies

From repo root:

```bash
npm ci
npm --prefix satyam-holidays-backend ci
npm --prefix satyam-holidays-react ci
```

### 2. Configure Backend Environment

Create backend env file from example:

```bash
# Linux/macOS
cp satyam-holidays-backend/env.example satyam-holidays-backend/.env

# Windows PowerShell
Copy-Item satyam-holidays-backend/env.example satyam-holidays-backend/.env
```

Minimum values to review in .env:
- MONGODB_URI
- JWT_SECRET
- CORS_ORIGIN
- EMAIL_USER and EMAIL_PASS (or SMTP_HOST and SMTP_USER and SMTP_PASS)

### 3. Run Full Stack

From repo root:

```bash
npm run dev
```

Default local ports:
- Frontend: http://localhost:3001
- Backend API: http://localhost:5000
- Health: http://localhost:5000/api/v1/health

## Useful Commands

From repo root:

```bash
npm run dev                      # Run backend and frontend together
npm run dev:backend              # Run backend only
npm run dev:frontend             # Run frontend only (port 3001)
npm run lint                     # Lint JS and JSX across monorepo
npm --prefix satyam-holidays-backend test -- --runInBand
npm --prefix satyam-holidays-react run build
```

Operations:

```bash
npm run ops:verify-production    # Post-deploy verification checks
npm run ops:monitoring:up        # Start app and monitoring via compose overlays
npm run ops:monitoring:down      # Stop app and monitoring stack
```

## Docker Compose

App stack:

```bash
docker compose -f docker-compose.yml up -d
```

App plus monitoring stack:

```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

Notes:
- docker-compose.yml reads backend environment from BACKEND_ENV_FILE.
- If BACKEND_ENV_FILE is not set, it defaults to satyam-holidays-backend/env.example.

## CI and Deployment

- CI workflow: .github/workflows/ci.yml
- CI validates:
  - JSON validity for both vercel.json files
  - Root lint
  - Backend tests
  - Frontend production build
- Recommended release flow:
  1. Open PR and ensure CI passes
  2. Validate Vercel Preview deployment
  3. Merge to main for production deployment

## Production Notes

- Backend and frontend are deployed as separate Vercel projects
- Use strict secret management through Vercel environment variables
- Run production verification after deploy:

```bash
npm --prefix satyam-holidays-backend run ops:verify-production
```

## API Snapshot

Common endpoints:
- GET /api/health
- GET /api/v1/health
- POST /api/enquiries
- GET /api/packages
- GET /api/reviews

For complete operational guidance, use:
- OPERATIONS_RUNBOOK.md
- PRODUCTION_CHECKLIST.md

## Related Documentation

- setup.md
- OPERATIONS_RUNBOOK.md
- PRODUCTION_CHECKLIST.md
- satyam-holidays-backend/QUICK_START.md
- satyam-holidays-backend/MONGODB_SETUP.md

## License

MIT
