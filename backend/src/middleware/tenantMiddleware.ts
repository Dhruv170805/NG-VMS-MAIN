import { Request, Response, NextFunction } from 'express';
import Tenant from '../models/Tenant';
import mongoose from 'mongoose';
import { TenantRequest } from '../types/requests';

export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    return next();
  }

  // Exempt routes that don't require a tenant context (e.g., bootstrap and health checks)
  const exemptRoutes = ['/api/bootstrap', '/api/system/health', '/api/system/version', '/bootstrap', '/system/health', '/system/version'];
  if (exemptRoutes.some(route => req.originalUrl.startsWith(route))) {
    const subdomain = req.headers['x-tenant-id'] as string;
    if (subdomain) {
      try {
        const tenant = await Tenant.findOne({ subdomain });
        if (tenant) {
          const tenantReq = req as TenantRequest;
          tenantReq.tenant = tenant;
          tenantReq.tenantId = tenant._id as mongoose.Types.ObjectId;
        }
      } catch (error) {
        console.error('[TENANT MIDDLEWARE] Safe extract error:', error);
      }
    }
    return next();
  }

  const subdomain = req.headers['x-tenant-id'] as string;

  if (!subdomain) {
    return res.status(400).json({ error: 'Tenant identifier missing (x-tenant-id header required)' });
  }

  try {
    const tenant = await Tenant.findOne({ subdomain });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenantReq = req as TenantRequest;
    tenantReq.tenant = tenant;
    tenantReq.tenantId = tenant._id as mongoose.Types.ObjectId;
    next();
  } catch (error) {
    console.error('[TENANT MIDDLEWARE] Error:', error);
    res.status(500).json({ error: 'Internal Server Error during tenant identification' });
  }
};
