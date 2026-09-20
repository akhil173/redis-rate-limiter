# @akhil/redis-rate-limiter

Distributed, Redis-backed rate limiting middleware for Express. Uses an atomic
Lua-scripted token bucket, so the limit holds correctly across any number of
horizontally-scaled instances — not just within one process.

## Why

Most rate-limiting middleware only works correctly with a single server
instance. This one is designed for the opposite case: run it across N replicas
behind a load balancer, and the combined request rate still respects the
configured limit, because every instance defers to the same atomic check in
Redis. Verified under concurrent load with k6 across 3 replicas — see the
[demo app](../demo-api) for the full setup and results.

## Install

```bash
npm install @akhil/redis-rate-limiter ioredis express
```

## Usage

```ts
import Redis from "ioredis";
import { rateLimiter } from "@akhil/redis-rate-limiter";

const redis = new Redis(process.env.REDIS_URL);

const limiter = rateLimiter(redis, {
  keyGenerator: (req) => req.tenantId || req.ip || "anonymous",
  capacity: 100,
  refillRatePerSec: 20,
});

app.use("/api", limiter);
```

## API

### `rateLimiter(redis, options)`

| Option | Type | Description |
|---|---|---|
| `keyGenerator` | `(req: Request) => string` | Identifies who's being limited — tenant ID, API key, IP, etc. |
| `capacity` | `number \| (req: Request) => number` | Max tokens the bucket holds (burst allowance). |
| `refillRatePerSec` | `number \| (req: Request) => number` | Tokens added back per second. |
| `failMode` | `"open" \| "closed"` | What happens if Redis is unreachable. Default: `"open"` (let traffic through). |

Returns standard Express middleware. Sets an `X-RateLimit-Remaining` header on
every response.

## How it works

Each request triggers exactly one Redis round trip: an `EVALSHA` call running
a Lua script that atomically reads the bucket's current token count, refills
it based on elapsed time since the last check (lazy refill — nothing ticks in
the background), decides allow/deny, and writes the new state back. Because
Redis executes the whole script as one indivisible operation, this stays
correct even when many gateway instances hit the same key concurrently.

## Known limitations

- If Redis restarts mid-run, the cached script SHA can go stale (`NOSCRIPT`),
  which isn't auto-recovered yet — a planned fix, not yet shipped.
- Config changes (capacity, refill rate) take effect immediately per-call;
  there's no built-in hot-reload coordination across instances yet.

## Roadmap

- [ ] Sliding-window-log mode as an alternate algorithm
- [ ] Redlock-based distributed lock for safe config hot-reload
- [ ] Per-route limits, not just per-key

## License

MIT