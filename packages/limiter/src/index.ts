import type { Request, Response, NextFunction } from 'express';
import type { Redis } from 'ioredis';

const TOKEN_BUCKET_SCRIPT = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local bucket = redis.call("HMGET", key, "tokens", "last_refill")
local tokens = tonumber(bucket[1])
local last_refill = tonumber(bucket[2])

if tokens == nil then
    tokens = capacity
    last_refill = now
end

local elapsed = math.max(0, now - last_refill) / 1000
tokens = math.min(capacity, tokens + elapsed * refill_rate)

local allowed = 0
if tokens >= requested then
    allowed = 1
    tokens = tokens - requested
end

redis.call("HMSET", key, "tokens", tokens, "last_refill", now)
redis.call("EXPIRE", key, math.ceil(capacity / refill_rate) * 2)
return { allowed, math.floor(tokens) }
`;

let scriptSha: string | null = null;

interface LimiterOptions {
  keyGenerator: (req: Request) => string;
  capacity: number | ((req: Request) => number);
  refillRatePerSec: number | ((req: Request) => number);
  failMode?: 'allow' | 'deny';
}

export function rateLimiter(redis: Redis, opts: LimiterOptions) {
    const failMode = opts.failMode ?? "allow";

    return async (req: Request, res: Response, next: NextFunction) => {
        const key = `ratelimiter:${opts.keyGenerator(req)}`;
        const now = Date.now();
        const capacity = typeof opts.capacity === 'function' ? opts.capacity(req) : opts.capacity;
        const refillRatePerSec = typeof opts.refillRatePerSec === 'function' ? opts.refillRatePerSec(req) : opts.refillRatePerSec;

        try {
            if (!scriptSha) {
                scriptSha = (await redis.script("LOAD", TOKEN_BUCKET_SCRIPT)) as string;
            }

            const [allowed, remaining] = await redis.evalsha(
                scriptSha, 1, key, capacity, refillRatePerSec, now, 1
            ) as [number, number];

            res.setHeader('X-RateLimit-Remaining', remaining);
            if (allowed == 1) {
                return next();
            }
            return res.status(429).json({ error: "rate_limit_exceeded" });
        } catch (error) {
            console.error("[rate-limiter] redis error:", error);
            if (failMode === "allow") return next(); // let traffic through rather than break the whole API
            res.status(503).json({ error: "rate_limiter_unavailable" });
        }
    }
}