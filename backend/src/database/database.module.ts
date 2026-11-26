import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }
  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) {
      continue;
    }
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

export const PG_POOL = 'PG_POOL';

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: async () => {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
          throw new Error('Falta configurar DATABASE_URL en las variables de entorno');
        }

        const isSupabaseOrRemote =
          connectionString.includes('supabase.co') ||
          connectionString.includes('pooler.supabase.com') ||
          process.env.NODE_ENV === 'production';

        const pool = new Pool({
          connectionString,
          ssl: isSupabaseOrRemote ? { rejectUnauthorized: false } : undefined,
        });

        const client = await pool.connect();
        client.release();
        return pool;
      },
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}