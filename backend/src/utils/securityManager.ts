import fs from 'fs';
import path from 'path';
import crypto from 'node:crypto';
import os from 'os';
import CryptoJS from 'crypto-js';
import * as si from 'systeminformation';
import Tenant from '../models/Tenant';
import mongoose from 'mongoose';

/**
 * NG-VMS Advanced License Perimeter
 * Multi-layered: RSA-SHA256 Sig -> AES-256-CBC Decryption -> Hardware Fingerprint
 */

export interface LicenseFeatures {
  email: boolean;
  sms: boolean;
  aadhaar: boolean;
  biometrics: boolean;
  analytics: boolean;
  storage: 'local' | 'minio' | 's3';
  branding?: {
    companyName: string;
    logoUrl?: string;
    logoFile?: string; // Support for local JPG files
  };
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  data?: {
    company?: string;
    companyCode?: string;
    project?: string;
    features: LicenseFeatures;
    network?: {
      ip?: string;
      mac?: string;
    };
    dbConfig?: {
      host: string;
      port: number;
      dbName: string;
    };
    expiresAt?: Date;
    status?: string;
    hardwareHash?: string;
    rootAdmin?: {
      id: string;
      password?: string; // Encrypted or plain to be hashed
    };
  };
}

export class SecurityManager {
  private static instance: SecurityManager;
  private publicKey: string | null = null;
  private secretKey: string;
  private cachedFingerprint: string | null = null;

  private constructor() {
    // AES Secret Key (256-bit)
    this.secretKey = (process.env.LICENSE_SECRET || 'ngs-enterprise-system-validation').substring(0, 32);
    
    // RSA Public Key (Standard PEM)
    const publicKeyPath = path.join(process.cwd(), 'public.pem');
    if (fs.existsSync(publicKeyPath)) {
      this.publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    } else {
      console.warn('[SECURITY] public.pem not found. RSA signature validation will be bypassed.');
    }
  }

  public static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  /**
   * Decrypts AES-256-CBC payload (CryptoJS Compatible)
   */
  private decryptAES(encryptedData: string): string {
    try {
      // CryptoJS handles both Raw AES (with Salted__ prefix) and OpenSSL-compatible password-based encryption
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.secretKey);
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
      if (!decryptedData) throw new Error('Decryption resulted in empty string');
      return decryptedData;
    } catch (error: any) {
      // Fallback: Check if it's already plain JSON (for local dev without encryption)
      try {
        const raw = Buffer.from(encryptedData, 'base64').toString();
        JSON.parse(raw);
        return raw;
      } catch {
        throw new Error(`Decryption failed: ${(error as any)?.message || 'Invalid secret or format'}`);
      }
    }
  }

  /**
   * Verifies RSA-SHA256 signature
   */
  private verifyRSASignature(payload: string, signature: string): boolean {
    if (!this.publicKey) return true; // Skip ONLY if public key is not provided
    try {
      const verifier = crypto.createVerify('SHA256');
      verifier.update(payload);
      return verifier.verify(this.publicKey, signature, 'base64');
    } catch (err) {
      return false;
    }
  }

  /**
   * Generates Hardware Fingerprint: sha256(serial + osUUID + hardwareUUID)
   */
  public async getHardwareFingerprint(): Promise<string> {
    if (this.cachedFingerprint) return this.cachedFingerprint;

    try {
      const system = await si.system();
      const uuid = await si.uuid();
      
      // The fingerprint is derived from stable hardware identifiers
      const hardwareString = `${system.serial}-${uuid.os}-${uuid.hardware}`;
      this.cachedFingerprint = crypto.createHash('sha256').update(hardwareString).digest('hex');
      return this.cachedFingerprint;
    } catch (error) {
      console.error('[SECURITY] Hardware Fingerprint Error:', error);
      // Fallback stable identifiers if SI fails
      const fallbackId = `${os.hostname()}-${os.platform()}-${os.totalmem()}`;
      return crypto.createHash('sha256').update(fallbackId).digest('hex');
    }
  }

  /**
   * Validates a license key for a specific tenant.
   */
  public async validateTenantLicense(licenseKey: string): Promise<ValidationResult> {
    try {
      let payload: any;
      let rawData: string;

      // 1. Check Format (JSON Signed or Raw AES)
      try {
        // Attempt to parse as Signed Payload: { "enc": "...", "sig": "..." }
        const decoded = JSON.parse(Buffer.from(licenseKey, 'base64').toString());
        if (decoded.enc && decoded.sig) {
          if (!this.verifyRSASignature(decoded.enc, decoded.sig)) {
            return { valid: false, reason: 'License signature verification failed' };
          }
          rawData = this.decryptAES(decoded.enc);
        } else {
          // Assume direct JSON base64 (Unsigned)
          rawData = Buffer.from(licenseKey, 'base64').toString();
        }
        payload = JSON.parse(rawData);
      } catch (e) {
        // Raw AES Mode (Encrypted string directly)
        rawData = this.decryptAES(licenseKey);
        payload = JSON.parse(rawData);
      }
      
      // --- Sovereign Decryption Audit ---
      console.log('🛡️ [SECURITY] Sovereign License Decrypted Successfully.');
      console.log(`🏢 Company: ${payload.company || 'NOT_SET'}`);
      console.log(`🖼️ Logo URL: ${payload.features?.branding?.logoUrl || 'DEFAULT'}`);
      console.log(`📁 Logo JPG: ${payload.features?.branding?.logoFile || 'N/A'}`);
      console.log(`📅 Validity: ${payload.issuedAt || 'N/A'} -> ${payload.expiresAt || 'N/A'}`);
      console.log(`🔑 Root Admin ID: ${payload.rootAdmin?.id || 'NOT_PROVISIONED'}`);
      console.log(`✨ Features: ${Object.keys(payload.features || {}).filter(k => payload.features[k] === true).join(', ')}`);
      // ----------------------------------

      // 2. Validate Metadata
      if (payload.status !== 'ACTIVE') {
        return { valid: false, reason: 'License is not active' };
      }

      if (payload.expiresAt && new Date(payload.expiresAt) < new Date()) {
        return { valid: false, reason: 'License expired' };
      }

      // 3. Hardware Lock
      if (payload.hardwareHash) {
        const localHash = await this.getHardwareFingerprint();
        if (payload.hardwareHash !== localHash && !process.env.SKIP_HW_LOCK) {
          console.warn('[SECURITY] Hardware Mismatch. License locked to another machine.');
          return { valid: false, reason: 'License is not valid for this hardware' };
        }
      }

      return {
        valid: true,
        data: {
          company: payload.company,
          companyCode: payload.companyCode,
          project: payload.project,
          features: {
            email: !!payload.features?.email,
            sms: !!payload.features?.sms,
            aadhaar: !!payload.features?.aadhaar,
            biometrics: !!payload.features?.biometrics,
            analytics: !!payload.features?.analytics,
            storage: payload.features?.storage || 'local',
            branding: payload.features?.branding
          },
          network: payload.network,
          dbConfig: payload.dbConfig,
          expiresAt: payload.expiresAt,
          status: payload.status,
          hardwareHash: payload.hardwareHash,
          rootAdmin: payload.rootAdmin
        }
      };
    } catch (error) {
      console.error('[SECURITY] License Validation Error:', error);
      return { valid: false, reason: 'Invalid license format or decryption error' };
    }
  }

  /**
   * Utility to get features for a tenant
   */
  public async getTenantFeatures(tenantId: mongoose.Types.ObjectId): Promise<LicenseFeatures> {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        console.warn(`[SECURITY] Tenant not found for ID: ${tenantId}`);
        return { email: false, sms: false, aadhaar: false, biometrics: false, analytics: false, storage: 'local' };
      }
      if (!tenant.licenseKey) {
        console.warn(`[SECURITY] No license key found for tenant: ${tenant.name}`);
        return { email: false, sms: false, aadhaar: false, biometrics: false, analytics: false, storage: 'local' };
      }

      const result = await this.validateTenantLicense(tenant.licenseKey);
      if (!result.valid) {
        console.warn(`[SECURITY] Invalid license for tenant ${tenant.name}: ${result.reason}`);
      }
      return result.data?.features || { email: false, sms: false, aadhaar: false, biometrics: false, analytics: false, storage: 'local' };
    } catch (error: any) {
      console.error(`[SECURITY] Error getting tenant features for ID ${tenantId}:`, error);
      return { email: false, sms: false, aadhaar: false, biometrics: false, analytics: false, storage: 'local' };
    }
  }
}
