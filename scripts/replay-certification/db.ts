import { execSync } from 'child_process';

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

export class Database {
  async query(sql: string): Promise<{ rows: any[] }> {
    try {
      // Use psql to execute query and return JSON
      const command = `psql "${DB_URL}" -t -A -c "SELECT json_agg(t) FROM (${sql}) t"`;
      const output = execSync(command, { encoding: 'utf8' }).trim();
      
      if (!output) {
        return { rows: [] };
      }
      
      const data = JSON.parse(output);
      return { rows: data || [] };
    } catch (e: any) {
      if (e.message.includes('JSON.parse')) {
         return { rows: [] };
      }
      throw e;
    }
  }

  async execute(sql: string): Promise<void> {
    execSync(`psql "${DB_URL}" -c "${sql}"`, { stdio: 'inherit' });
  }
}

export const db = new Database();
