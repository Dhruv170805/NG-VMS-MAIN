# NG-VMS Sovereign License Guide

This guide explains how the machine-locked license system works and how to manage it.

## 1. The Perimeter Logic
The system uses a multi-layered security approach:
- **AES-256-CBC Encryption**: The license payload is encrypted using a 32-character secret key.
- **Hardware Lock**: The license can be locked to specific hardware (Serial + OS UUID + Hardware UUID).
- **RSA Signature**: Optional signature verification to ensure the license was issued by the root authority.

## 2. Default Secrets
- **Secret Key**: `ngs-enterprise-system-validation`
- **Default License File**: `NGS.lic`

## 3. Management UI
You can manage licenses directly from the **System Config** (Settings) tab in the Admin Dashboard:
- **Activation**: Paste the encrypted license string or upload a `.vlic` file.
- **Inspection**: Use the built-in "Inspector" to decrypt and view the license payload. This is for transparency and debugging.
- **Real-time Updates**: Activating a license immediately unlocks system features (Aadhaar, Biometrics, etc.) across the platform.

## 4. License Tool (CLI)
You can use a local tool to generate licenses for your tenants.

```javascript
// Example Generation Code (license_tool.js)
const CryptoJS = require('crypto-js');
const SECRET_KEY = 'ngs-enterprise-system-validation';

function generateLicense(payload) {
  return CryptoJS.AES.encrypt(JSON.stringify(payload), SECRET_KEY).toString();
}
```

## 5. Implementation Details
The core logic resides in:
- `backend/src/utils/securityManager.ts`: Handles decryption and validation.
- `backend/src/modules/system/system.service.ts`: Backend service for license management.
- `frontend/src/hooks/useAdminDashboard.ts`: Frontend state and API calls.
- `frontend/components/admin/SettingsTab.tsx`: The UI implementation.

---
© 2026 NG-VMS Sovereign Engineering Team.
