import * as fs from 'fs';
import * as path from 'path';

export interface AdoConfig {
  pat: string;
  organization: string;
  project: string;
  defaultAreaPath: string;
  defaultIterationPath: string;
  iterationPaths: string[];
  areaPaths: string[];
}

let cached: AdoConfig | null = null;

export function loadConfig(): AdoConfig {
  if (cached) return cached;

  const configPath = path.resolve(__dirname, '../../config/ado.config.json');

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Config file not found at: ${configPath}\n` +
      `Copy backend/config/ado.config.json.example to backend/config/ado.config.json and fill in your PAT.`
    );
  }

  const raw = fs.readFileSync(configPath, 'utf-8');
  const config = JSON.parse(raw) as AdoConfig;

  if (!config.pat || config.pat === 'YOUR_PERSONAL_ACCESS_TOKEN_HERE') {
    throw new Error('Set a valid PAT in backend/config/ado.config.json');
  }
  if (!config.organization || config.organization === 'YOUR_ADO_ORGANIZATION') {
    throw new Error('Set organization in backend/config/ado.config.json');
  }
  if (!config.project) {
    throw new Error('Set project in backend/config/ado.config.json');
  }

  config.iterationPaths = config.iterationPaths ?? [config.defaultIterationPath];
  config.areaPaths = config.areaPaths ?? [config.defaultAreaPath];

  cached = config;
  return cached;
}
