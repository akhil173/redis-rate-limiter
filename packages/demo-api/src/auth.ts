// packages/demo-api/src/auth.ts
import type { Request, Response, NextFunction } from "express";

/**
 * STUB — decodes the JWT payload to read the tenant ID but does NOT verify
 * the signature. Anyone can forge a token right now. This exists purely to
 * unblock testing the tenant rate limiter before real auth is wired in.
 *
 * TODO: swap the manual decode below for jwt.verify(token, JWT_SECRET)
 * once real auth is ready — everything else in the chain stays identical.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "missing_token" });
  }

  try {
    const payloadSegment = token.split(".")[1];
    const decoded = JSON.parse(Buffer.from(payloadSegment, "base64url").toString("utf-8"));

    if (!decoded.sub) {
      return res.status(401).json({ error: "invalid_token" });
    }

    req.tenantId = decoded.sub;
    next();
  } catch {
    res.status(401).json({ error: "invalid_token" });
  }
}