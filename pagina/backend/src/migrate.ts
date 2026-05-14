import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import pool from './config/database';

async function migrate() {
  const sqlPath = join(__dirname, '..', 'migrations', '001_schema.sql');
  const sql = readFileSync(sqlPath, 'utf8');

  console.log('🔄 Ejecutando migración unificada…');
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('✅ Migración completada correctamente');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('❌ Migración fallida:', err.message);
  process.exit(1);
});
