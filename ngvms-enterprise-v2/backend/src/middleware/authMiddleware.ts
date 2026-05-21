import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, TenantRequest } from '../types/requests';

export const protect = (req: Request, res: Response, next: NextFunction): void => {
  let token;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('FATAL ERROR: JWT_SECRET must be defined');
      }
      const decoded = jwt.verify(token, secret) as { id: string, name: string, role: string, tenantId: string };
      
      const tenantReq = req as TenantRequest;
      // Verify user belongs to this tenant
      if (tenantReq.tenantId && decoded.tenantId !== tenantReq.tenantId.toString()) {
        res.status(401).json({ message: 'Not authorized for this tenant' });
        return;
      }

      (req as AuthRequest).user = decoded;
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;
    if (!authReq.user || !roles.includes(authReq.user.role)) {
       res.status(403).json({ message: `User role ${authReq.user?.role} is not authorized to access this route` });
       return;
    }
    next();
  };
};
