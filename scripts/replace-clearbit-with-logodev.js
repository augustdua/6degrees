/**
 * Replace all Clearbit URLs with logo.dev URLs in seed script
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'backend', 'src', 'scripts', 'seedDemoOffersRequests.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Add token constant at the top if not already there
if (!content.includes('LOGO_DEV_TOKEN')) {
  content = content.replace(
    "import { v4 as uuidv4 } from 'uuid';",
    "import { v4 as uuidv4 } from 'uuid';\n\n// Logo.dev API token for fetching organization logos\nconst LOGO_DEV_TOKEN = 'pk_dvr547hlTjGTLwg7G9xcbQ';"
  );
}

// Replace all Clearbit URLs with logo.dev URLs
content = content.replace(
  /logo_url: 'https:\/\/logo\.clearbit\.com\/([^']+)'/g,
  "logo_url: `https://img.logo.dev/$1?token=${LOGO_DEV_TOKEN}`"
);

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Successfully replaced all Clearbit URLs with logo.dev URLs');

