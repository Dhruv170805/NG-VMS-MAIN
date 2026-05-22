import Tenant from '../../models/Tenant';
import Employee from '../../models/Employee';
import Setting from '../../models/Setting';
import bcryptjs from 'bcryptjs';

export class BootstrapService {
  static async checkStatus() {
    const tenantCount = await Tenant.countDocuments();
    return { bootstrapRequired: tenantCount === 0 };
  }

  static async runBootstrap(data: any) {
    const tenantCount = await Tenant.countDocuments();
    if (tenantCount > 0) {
      throw new Error('Bootstrap already completed. Endpoint permanently disabled.');
    }

    const { 
      companyName, subdomain, 
      adminName, adminEmail, adminPassword, 
      licenseKey, 
      smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom,
      guardName, guardEmail, guardPassword 
    } = data;

    if (!companyName || !adminEmail || !adminPassword) {
      throw new Error('Company Name, Admin Email, and Admin Password are required.');
    }

    let finalLicenseKey = licenseKey;
    if (!finalLicenseKey || finalLicenseKey === 'TRIAL-MODE') {
      const trialPayload = JSON.stringify({
        company: companyName,
        companyCode: subdomain || 'default',
        status: 'ACTIVE',
        features: { email: true, sms: false, aadhaar: false },
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days trial
      });
      finalLicenseKey = Buffer.from(trialPayload).toString('base64');
    }

    // 1. Create Tenant
    const tenant = new Tenant({
      name: companyName,
      subdomain: subdomain || 'default',
      licenseKey: finalLicenseKey
    });
    await tenant.save();

    // 2. Create Super Admin
    const hashedAdminPassword = await bcryptjs.hash(adminPassword, 10);
    const admin = new Employee({
      name: adminName || 'System Admin',
      email: adminEmail,
      password: hashedAdminPassword,
      role: 'ADMIN',
      department: 'Management',
      tenantId: tenant._id,
      isHost: true
    });
    await admin.save();

    // 3. Create First Guard
    if (guardEmail && guardPassword) {
      const hashedGuardPassword = await bcryptjs.hash(guardPassword, 10);
      const guard = new Employee({
        name: guardName || 'Main Gate',
        email: guardEmail,
        password: hashedGuardPassword,
        role: 'GUARD',
        department: 'Security',
        tenantId: tenant._id,
        isHost: false
      });
      await guard.save();
    }

    // 4. SMTP Settings
    if (smtpHost) {
      await Setting.create({
        tenantId: tenant._id,
        key: 'smtp_config',
        value: {
          host: smtpHost,
          port: smtpPort || 587,
          user: smtpUser,
          pass: smtpPass,
          from: smtpFrom || 'no-reply@ng-vms.enterprise',
          secure: Number(smtpPort) === 465
        }
      });
    }

    // 5. Default Notifications Settings
    await Setting.create({
      tenantId: tenant._id,
      key: 'notifications',
      value: {
        REGISTRATION: { HOST: { web: true, email: true, sms: false }, ADMIN: { web: true, email: false, sms: false }, GUARD: { web: true, email: false, sms: false } },
        APPROVAL: { VISITOR: { web: false, email: true, sms: false } },
        CHECK_IN: { HOST: { web: true, email: true, sms: false } },
        OVERDUE: { HOST: { web: true, email: true, sms: false }, ADMIN: { web: true, email: true, sms: false }, GUARD: { web: true, email: false, sms: false } }
      }
    });

    return { 
      success: true, 
      message: 'Bootstrap completed successfully. System is now locked.' 
    };
  }

  static async updateTenantLicense(licenseKey: string, data: any, companyCode: string) {
    const normalizedCode = companyCode.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    let tenant = await Tenant.findOne({ subdomain: normalizedCode });
    if (!tenant) {
      tenant = await Tenant.findOne();
    }

    if (tenant) {
      if (tenant.licenseKey !== licenseKey) {
        console.log(`🛡️ [SECURITY] New valid license detected for tenant '${tenant.name}' (file subdomain: ${companyCode}). Dynamically updating...`);
        tenant.licenseKey = licenseKey;
        await tenant.save();
        console.log(`🛡️ [SECURITY] Dynamic NGS license update complete for tenant: ${tenant.name}`);
        return true;
      }
    }
    return false;
  }
}
