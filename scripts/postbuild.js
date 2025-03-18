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
} else {
  console.error(`Error: ${distPublicDir} does not exist. Build the project first.`);
  process.exit(1);
} 