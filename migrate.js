require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

const SQL_FILES = [
  'database/schema.sql',
  'database/views.sql',
  'database/indexes.sql',
  'database/triggers.sql',
  'database/seeds.sql'
];

async function runMigration() {
  const client = await pool.connect();
  try {
    for (const file of SQL_FILES) {
      const filePath = path.join(__dirname, file);
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Arquivo não encontrado: ${file} — pulando...`);
        continue;
      }
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`\n▶ Executando: ${file}`);
      await client.query(sql);
      console.log(`✅ Concluído: ${file}`);
    }
    console.log('\n🎉 Migração concluída com sucesso! Banco de dados pronto.');
  } catch (err) {
    console.error('\n❌ Erro durante a migração:');
    console.error(err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
