import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const localApiBaseUrl = 'http://localhost:8080/api';
const productionApiBaseUrl = process.env.API_BASE_URL || 'https://highlight-vault.onrender.com/api';
const outputPath = resolve('src/app/core/config/api.generated.ts');

mkdirSync(dirname(outputPath), { recursive: true });

writeFileSync(
  outputPath,
  `export const LOCAL_API_BASE_URL = '${localApiBaseUrl}';\n` +
    `export const PRODUCTION_API_BASE_URL = '${productionApiBaseUrl}';\n`
);

console.log(`Generated API config with production URL: ${productionApiBaseUrl}`);
