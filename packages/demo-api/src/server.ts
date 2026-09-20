import express from 'express';
import dotenv from 'dotenv';
import { redis } from './redis';
import { rateLimiter } from '@akhil/redis-rate-limiter';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const ipLimiter = rateLimiter(redis, {
  keyGenerator: (req) => req.ip || "unknown",
  capacity: 20,
  refillRatePerSec: 5,
});

const tenantLimiter = rateLimiter(redis, {
  keyGenerator: (req) => req.tenantId || "anonymous",
  capacity: (req) => req.tenantConfig?.capacity ?? 5,
  refillRatePerSec: (req) => req.tenantConfig?.refillRatePerSec ?? 1,
  failMode: "deny",
});

app.get('/health', (_req, res) => {
    return res.json({ status: 'ok'});
});

app.get('/redis-check', async (_req, res) => {
    try {
        const pong = await redis.ping();
        return res.json({ redis: pong });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to check Redis connection' });
    }
});

app.get('/ping', tenantLimiter, (_req, res) => {
    return res.json({ message: 'Pong!' });
});

app.use(ipLimiter);
app.use(tenantLimiter);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});