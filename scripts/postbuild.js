// This script adds a _redirects file for Netlify to handle client-side routing
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create the _redirects content
const redirectsContent = `# Netlify redirects file
# Redirect all routes to index.html for client-side routing
/*    /index.html   200
`;

// Path to the dist/public directory
const distPublicDir = path.resolve(__dirname, '../dist/public');

// Check if the directory exists
if (fs.existsSync(distPublicDir)) {
  // Write the _redirects file
  const redirectsPath = path.resolve(distPublicDir, '_redirects');
  fs.writeFileSync(redirectsPath, redirectsContent);
  console.log(`Generated _redirects file at ${redirectsPath}`);
  
  // Copy env-config.js to dist/public if it exists
  const sourceEnvConfig = path.resolve(__dirname, '../client/public/env-config.js');
  if (fs.existsSync(sourceEnvConfig)) {
    const destEnvConfig = path.resolve(distPublicDir, 'env-config.js');
    fs.copyFileSync(sourceEnvConfig, destEnvConfig);
    console.log(`Copied env-config.js to ${destEnvConfig}`);
  } else {
    console.warn('Warning: env-config.js not found in client/public');
  }
} else {
  console.error(`Error: ${distPublicDir} does not exist. Build the project first.`);
  process.exit(1);
} 