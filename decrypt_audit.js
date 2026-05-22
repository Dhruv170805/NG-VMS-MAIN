const CryptoJS = require('crypto-js');
const fs = require('fs');

/**
 * NG-VMS Sovereign Decryption Auditor
 */

const SECRET_KEY = 'ngs-enterprise-system-validation'; 

function auditLicense(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: License file ${filePath} not found.`);
    return;
  }

  const encryptedData = fs.readFileSync(filePath, 'utf8').trim();
  console.log(`🔍 [AUDIT] Starting Decryption Sequence for: ${filePath}`);

  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedData) {
      console.error('❌ Error: Decryption failed.');
      return;
    }

    const payload = JSON.parse(decryptedData);

    console.log('\n🛡️ --- SOVEREIGN DECRYPTION RESULTS ---');
    console.log(`🏢 COMPANY:      ${payload.companyName || payload.company || 'N/A'}`);
    console.log(`📁 LOGO JPG:     ${payload.logoFile || payload.features?.branding?.logoFile || 'N/A'}`);
    console.log(`🖼️ LOGO URL:     ${payload.logoUrl || payload.features?.branding?.logoUrl || 'N/A'}`);
    console.log(`📅 ISSUED AT:    ${payload.issuedAt || 'N/A'}`);
    console.log(`⌛ EXPIRES AT:   ${payload.expiresAt || 'N/A'}`);
    console.log(`🔑 ROOT ADMIN:   ${payload.rootAdmin?.id || payload.adminId || 'N/A'}`);
    console.log(`🔐 ROOT PASS:    ${payload.rootAdmin?.password || payload.adminPassword ? '******** (PRESENT)' : 'MISSING'}`);
    
    console.log('\n✨ ENABLED FEATURES:');
    if (payload.features) {
      Object.keys(payload.features).forEach(feature => {
        if (typeof payload.features[feature] === 'boolean' && payload.features[feature]) {
          console.log(`   ✅ ${feature.toUpperCase()}`);
        }
      });
    }
    console.log('---------------------------------------\n');

  } catch (error) {
    console.error('❌ Error: Unexpected failure during decryption.');
  }
}

const fileToAudit = process.argv[2] || 'NGS.lic';
auditLicense(fileToAudit);
