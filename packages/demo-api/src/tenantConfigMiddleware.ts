import { Request, Response, NextFunction } from "express";
import { getTenantConfig } from "./tenantConfig";

export async function attachTenantConfig(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.tenantId;
    if (!tenantId) {
        return res.status(400).json({ error: "missing_tenant_id" });
    }
    const config = await getTenantConfig(tenantId);
    req.tenantConfig = config;
    next();
}