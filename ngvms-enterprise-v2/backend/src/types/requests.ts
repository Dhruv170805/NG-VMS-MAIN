import { Request } from 'express';
import mongoose from 'mongoose';
import { ITenant } from '../models/Tenant';

/**
 * Request augmented with Tenant information by TenantMiddleware
 */
export interface TenantRequest<T = any> extends Request {
  tenantId?: mongoose.Types.ObjectId;
  tenant?: ITenant;
  body: T;
}

/**
 * Request augmented with User information by AuthMiddleware
 */
export interface AuthRequest<T = any> extends TenantRequest<T> {
  user?: {
    id: string;
    name: string;
    role: string;
    tenantId: string;
  };
}
