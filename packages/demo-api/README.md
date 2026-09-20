# demo-api

Reference implementation showing `@akhil/redis-rate-limiter` in a real
Express app — layered IP + tenant rate limiting, JWT auth, and per-tenant
Redis-backed quota config. This isn't published; it's the proof that the
published package actually works end to end.

## Status

- [x] Core token-bucket middleware, wired in
- [x] Layered middleware: IP limiter → auth → tenant limiter
- [x] Per-tenant quota stored in Redis, cached in-process
- [ ] Multi-replica docker-compose setup
- [ ] k6 load test proving the shared-limit guarantee under concurrency
- [ ] `/metrics` endpoint (Prometheus)

## Run locally

```bash
docker run -d --name redis-dev -p 6379:6379 redis:7-alpine
npm install        # from repo root — wires up workspace symlinks
npm run dev --workspace=packages/demo-api
```

Requires a `.env` in `packages/demo-api/`:

```
PORT=3000
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-change-me
```

## Routes

| Route | Auth | Rate limit |
|---|---|---|
| `GET /health` | none | none |
| `GET /redis-check` | none | none |
| `GET /api/ping` | Bearer JWT | IP (coarse) → tenant (per-plan quota) |

## Set a tenant's quota

```bash
redis-cli HSET tenant:config:acme capacity 100 refillRate 20
```

## License

MIT