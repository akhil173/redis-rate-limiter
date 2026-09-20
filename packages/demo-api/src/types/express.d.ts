// src/types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenantConfig?: { capacity: number; refillRatePerSec: number };
    }
  }
}
export {};