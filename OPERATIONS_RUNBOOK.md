# Operations Runbook

This runbook turns production checklist items into concrete, repeatable steps.

## 0. Deployment model (Vercel + GitHub)

- This repo is deployed as two Vercel projects:
  - frontend project root: `satyam-holidays-react`
  - backend project root: `satyam-holidays-backend`
- GitHub PRs create Preview deployments and pushes to `main` create Production deployments.
- Keep branch protection enabled so CI checks from `.github/workflows/ci.yml` must pass before merge.
- Manage runtime env vars in Vercel project settings (Production/Preview/Development scopes).
- Use local env sync when needed:

```bash
# from each project directory
vercel env pull .env.local
```

## 1. Rotate credentials

Generate strong application secrets:

```bash
cd satyam-holidays-backend
npm run security:generate-secrets
# Optional: write directly into a target env file
npm run security:generate-secrets -- --env-file=.env.production
```

Rotate external keys in provider dashboards:

- Cloudinary API key/secret
- reCAPTCHA or hCaptcha keys
- SMTP credentials
- Sentry DSN project key (if rotated policy requires it)

## 2. Infrastructure setup

### Database (MongoDB Atlas + IP whitelist)

- Use Atlas connection string format: mongodb+srv://...
- Add outbound IPs of your app hosts in Atlas Network Access list.
- Keep ALLOW_NON_ATLAS_DB=false in production.

### Redis cache

- For Vercel deployments, use a managed Redis provider (for example Upstash/Redis Cloud) and set `REDIS_URL`.
- Set `REDIS_REQUIRED=true` in production if your alert policy treats Redis as mandatory.

### CDN + TLS

- Vercel provides global edge caching and TLS termination by default.
- Keep immutable caching for static assets via frontend `vercel.json` headers.
- If you use Cloudflare in front of Vercel, bypass API routes from full-page caching.

### Load balancer

- Vercel serverless/edge infrastructure handles request distribution automatically.
- `infra/nginx/load-balancer.conf` is only for non-Vercel self-hosted deployments.

### Monitoring and alerts

- Primary production monitoring on Vercel should include:
  - Vercel project analytics/logs
  - Sentry error tracking
  - external uptime checks (for frontend and `/api/v1/health`)

### Optional self-hosted monitoring stack

```bash
# Start app + monitoring stack together
cd ..
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

Services:

- Prometheus: http://localhost:9090
- Alertmanager: http://localhost:9093
- Uptime Kuma: http://localhost:3002

## 3. Post-deploy verification

Set these environment variables before running verification:

- API_BASE_URL (use your Vercel backend production or preview URL)
- ADMIN_EMAIL
- ADMIN_PASSWORD
- VERIFY_EMAIL_TO
- SENTRY_DSN
- Cloudinary credentials

Run:

```bash
cd satyam-holidays-backend
npm run ops:verify-production
```

The verification script checks:

- health endpoint
- admin login and token verification
- HTTP to HTTPS redirect
- Sentry test event emission
- Cloudinary API ping
- email transport verification + test mail

Tip for Preview validation:

- On pull requests, run the verifier against the Preview backend URL before promoting changes to `main`.

## 4. Performance gate

```bash
cd ../satyam-holidays-react
npm run perf:lighthouse
```

This command now runs a deterministic local Lighthouse gate via `scripts/lighthouse-gate.js` and fails with explicit metric deltas when thresholds are not met.

If you need the previous LHCI workflow for comparison:

```bash
npm run perf:lighthouse:lhci
```

Thresholds are enforced in `scripts/lighthouse-gate.js`:

- FCP < 2s
- TTI < 4s
- TBT < 300ms
- CLS < 0.1
- LCP < 2.5s

## 5. Backup, restore, rollback

Create backup:

```bash
cd ../satyam-holidays-backend
npm run backup
```

Restore a backup:

```bash
npm run restore -- ./backups/<backup-file>.tar.gz
```

Rollback to latest backup:

```bash
npm run rollback
```

Recommended backup schedule (server cron):

```cron
0 2 * * * /path/to/satyam-holidays-backend/scripts/backup.sh >> /var/log/satyam-backup.log 2>&1
```

## 6. Alert coverage

Configured alert rules in monitoring/alerts.yml include:

- uptime monitoring
- elevated backend error rate
- CPU, memory, and disk usage
- MongoDB connectivity and pool saturation
- Redis disconnect when REDIS_REQUIRED=true

Adjust thresholds based on production baseline after one week of traffic.

## 7. CI/CD alignment for Vercel

- CI in `.github/workflows/ci.yml` runs lint, backend tests, frontend build, and validates both `vercel.json` files.
- Vercel remains the deploy orchestrator; GitHub Actions acts as the merge quality gate.
- Recommended release flow:
  1.  Open PR -> review CI + Vercel Preview.
  2.  Run `ops:verify-production` against Preview URL for high-risk changes.
  3.  Merge to `main` -> Vercel Production deploy.
