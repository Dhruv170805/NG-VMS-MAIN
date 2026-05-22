import dotenv from 'dotenv';
dotenv.config(); // MUST be first — before any module that reads process.env
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { SecurityManager } from './utils/securityManager';

import { startOtel, shutdownTracing } from './utils/otel';
startOtel();

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { validateEnv } from './config/env';

// Pre-flight environment check
validateEnv();

import { EventEmitter } from 'events';
// Runtime stability: prevent MaxListenersExceededWarning on ServerResponse
// This happens when multiple instrumentations (OTEL, express-rate-limit, etc.) attach listeners
EventEmitter.defaultMaxListeners = 25;
process.setMaxListeners(25);

// Routes
import visitorRoutes from './modules/visitor/visitor.routes';
import authRoutes from './modules/auth/auth.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import systemRoutes from './modules/system/system.routes';
import employeeRoutes from './modules/employee/employee.routes';
import gateRoutes from './modules/gate/gate.routes';
import handoverRoutes from './modules/handover/handover.routes';
import blacklistRoutes from './modules/blacklist/blacklist.routes';
import aadhaarRoutes from './modules/aadhaar/aadhaar.routes';
import bootstrapRoutes from './modules/bootstrap/bootstrap.routes';
import { BootstrapService } from './modules/bootstrap/bootstrap.service';
import { setNotificationIO } from './utils/notificationService';
import { tenantMiddleware } from './middleware/tenantMiddleware';
import { errorHandler } from './middleware/errorHandler';

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// CORS — support dynamic subdomains
const baseFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
const baseDomain = baseFrontendUrl.replace(/^https?:\/\//, '').split(':')[0];

const allowedOrigins = new Set(
  [
    baseFrontendUrl,
    'http://localhost:3000',
    'http://localhost:8080',
    process.env.CORS_EXTRA_ORIGIN,
  ].filter(Boolean)
);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server (no Origin) and explicitly allowed origins
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin '${origin}' not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-tenant-id'],
};

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts, please try again after 15 minutes',
});

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) callback(null, true);
      else callback(new Error('CORS: Origin not allowed'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 20000,
  pingInterval: 10000,
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  connectTimeout: 45000,
});

// Redis Adapter for horizontal scalability
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const pubClient = createClient({ url: REDIS_URL });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()])
  .then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('[NG-VMS] Socket.io Redis adapter connected');
  })
  .catch((err) => {
    console.warn('[NG-VMS] Redis unavailable, using in-memory adapter:', err.message);
  });

setNotificationIO(io);

// Middleware
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// Apply Tenant Middleware to all API routes
app.use('/api', tenantMiddleware);

app.use('/api', limiter);
app.use('/api/auth/login', authLimiter);

// Make Socket.io available in controllers
app.set('socketio', io);

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ng-vms';
mongoose
  .connect(MONGODB_URI, {
    maxPoolSize: 20,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(async () => {
    mongoose.connection.setMaxListeners(25);
    console.log('[NG-VMS] Connected to MongoDB');

    // Auto-bootstrap or update tenant license from files dynamically on startup
    try {
      const searchDirs = [
        process.cwd(),
        path.join(process.cwd(), 'shared')
      ];
      const foundLicenses: { path: string; filename: string; key: string; companyCode: string }[] = [];

      // Check explicit environment variable first
      if (process.env.LICENSE_KEY_PATH && fs.existsSync(process.env.LICENSE_KEY_PATH)) {
        try {
          const key = fs.readFileSync(process.env.LICENSE_KEY_PATH, 'utf8').trim();
          if (key) {
            const filename = path.basename(process.env.LICENSE_KEY_PATH);
            const match = filename.match(/^([a-zA-Z0-9_-]+)&([a-zA-Z0-9_-]+)_NGS\.lic$/i);
            const companyCode = match ? match[1] : 'demo';
            foundLicenses.push({ path: process.env.LICENSE_KEY_PATH, filename, key, companyCode });
          }
        } catch (err) {}
      }

      // Check directories for *_NGS.lic
      for (const dir of searchDirs) {
        if (!fs.existsSync(dir)) continue;
        try {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const isNgsLic = file.toLowerCase().endsWith('_ngs.lic');
            if (isNgsLic) {
              const fullPath = path.join(dir, file);
              try {
                const key = fs.readFileSync(fullPath, 'utf8').trim();
                if (key) {
                  const match = file.match(/^([a-zA-Z0-9_-]+)&([a-zA-Z0-9_-]+)_NGS\.lic$/i);
                  const companyCode = match ? match[1] : 'demo';
                  foundLicenses.push({ path: fullPath, filename: file, key, companyCode });
                }
              } catch (err) {}
            }
          }
        } catch (err) {}
      }

      const securityManager = SecurityManager.getInstance();

      // Process each found license key
      for (const lic of foundLicenses) {
        const validation = await securityManager.validateTenantLicense(lic.key);
        if (!validation.valid) {
          console.warn(`[NG-VMS] Found license file at ${lic.path} but validation failed: ${validation.reason}`);
          continue;
        }

        const data = validation.data!;
        const companyCode = (lic.companyCode || data.companyCode || data.company || 'demo').toLowerCase().replace(/[^a-z0-9_-]/g, '');

        const status = await BootstrapService.checkStatus();
        if (status.bootstrapRequired) {
          console.log(`[NG-VMS] Clean database detected. Auto-bootstrapping using license from ${lic.path}...`);
          const companyName = data.company || 'Enterprise Corporation';
          const adminEmail = data.rootAdmin?.id || 'admin@enterprise.com';
          const adminPassword = data.rootAdmin?.password || 'password123';

          await BootstrapService.runBootstrap({
            companyName,
            subdomain: companyCode,
            adminName: 'System Administrator',
            adminEmail,
            adminPassword,
            guardName: 'Main Gate Guard',
            guardEmail: `guard@${companyCode}.com`,
            guardPassword: adminPassword,
            licenseKey: lic.key
          });
          console.log(`[NG-VMS] Auto-bootstrapping complete! Tenant: ${companyName}, Subdomain: ${companyCode}, Admin: ${adminEmail}`);
        } else {
          // If already bootstrapped, check for dynamic update/alignment
          await BootstrapService.updateTenantLicense(lic.key, data, companyCode);
        }
      }
    } catch (err: any) {
      console.error('[NG-VMS] Dynamic license processing error:', err.message);
    }
  })
  .catch((err) => console.error('[NG-VMS] MongoDB Connection Error:', err));

// Socket.io Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    // Non-authenticated socket (e.g. public visitor viewing a pass)
    return next();
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return next(new Error('JWT_SECRET is not configured'));
    }
    const decoded = jwt.verify(token, secret) as { id: string, name: string, role: string, tenantId: string };
    (socket as any).user = decoded;
    (socket as any).tenantId = decoded.tenantId;
    next();
  } catch (error) {
    console.error('[SOCKET AUTH] Auth Error:', error);
    next(new Error('Authentication failed'));
  }
});

// Socket.io Event Handlers
io.on('connection', (socket) => {
  const user = (socket as any).user;
  const tenantId = (socket as any).tenantId;

  if (tenantId) {
    // Automically join the global tenant room for updates
    socket.join(`tenant_${tenantId}`);
  }

  socket.on('ping', () => socket.emit('pong'));

  socket.on('join:host', (hostId: string) => {
    // Hosts must be authenticated within a tenant context
    if (!tenantId) {
      return;
    }
    socket.join(`tenant_${tenantId}_host_${hostId}`);
  });

  socket.on('join:visitor', async (visitorId: string) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(visitorId)) return;
      const visitor = await mongoose.model('Visitor').findOne({ _id: visitorId }) as any;
      if (visitor) {
        // Strict tenant boundary: if authenticated, socket tenantId must match visitor tenantId
        if (tenantId && tenantId.toString() !== visitor.tenantId.toString()) {
          return;
        }
        socket.join(`tenant_${visitor.tenantId}_visitor_${visitorId}`);
      }
    } catch (err) {
      // Safe catch
    }
  });

  socket.on('disconnect', () => {
    // Intentionally silent — handled by redis adapter
  });
});

// API Routes
app.get('/', (_req, res) =>
  res.status(200).send(`NG-VMS API Server is running. Access the frontend at ${baseFrontendUrl}`)
);
app.use('/api/auth', authRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/bootstrap', bootstrapRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/gate', gateRoutes);
app.use('/api/handover', handoverRoutes);
app.use('/api/blacklist', blacklistRoutes);
app.use('/api/aadhaar', aadhaarRoutes);

// Catch-all 404 for API
app.use('/api', (req, res) => {
  console.warn(`[404] Missing API Endpoint: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ success: false, message: `API endpoint not found: ${req.originalUrl}` });
});

// Health Check
app.get('/health', (_req, res) =>
  res.status(200).json({ status: 'healthy', version: '1.0.0', timestamp: new Date().toISOString() })
);

// Centralized error handler — must be last
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 5000;

// Graceful Shutdown
const shutdown = async () => {
  console.log('\n[NG-VMS] Initiating graceful shutdown...');
  try {
    io.close();
    if (pubClient.isOpen) await pubClient.quit();
    if (subClient.isOpen) await subClient.quit();
    await mongoose.connection.close();
    await shutdownTracing();
    server.close(() => {
      console.log('[NG-VMS] Server offline. Shutdown complete.');
      process.exit(0);
    });
  } catch (err) {
    console.error('[NG-VMS] Shutdown error:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[NG-VMS] Server running on http://127.0.0.1:${PORT}`);
});
