import { redis } from './redis';

interface TenantConfig {
    capacity: number;
    refillRatePerSec: number;
}

const DEFAULT_TENANT_CONFIG: TenantConfig = {
    capacity: 5,
    refillRatePerSec: 1
};

const TENANT_CONFIG_CACHE_TTL_MS = 60000; // 1 minute

const cache = new Map<string, { config: TenantConfig, expiresAt: number }>();

export async function getTenantConfig(tenantId: string): Promise<TenantConfig> {
    const tenantConfig = cache.get(tenantId);
    if (tenantConfig && tenantConfig.expiresAt > Date.now()) {
        return tenantConfig.config;
    }

    // Simulate fetching tenant config from a database or external service
    const raw = await redis.hgetall(`tenant:${tenantId}:config`);
    const config = raw.capacity && raw.refillRatePerSec
        ? {
            capacity: parseInt(raw.capacity),
            refillRatePerSec: parseFloat(raw.refillRatePerSec)
        }
        : DEFAULT_TENANT_CONFIG;

    cache.set(tenantId, { config, expiresAt: Date.now() + TENANT_CONFIG_CACHE_TTL_MS }); // Cache for 1 minute
    return config;
}