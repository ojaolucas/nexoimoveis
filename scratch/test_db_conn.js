const { Client } = require('pg');

const passwords = ['', 'postgres', 'admin', '123456', 'root', 'MovixFrota@2026'];
const databases = ['nexoimoveis', 'postgres'];

async function probe() {
  for (const db of databases) {
    for (const pw of passwords) {
      const client = new Client({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: pw,
        database: db,
        ssl: false
      });
      try {
        await client.connect();
        console.log(`SUCCESS: user=postgres password="${pw}" database="${db}"`);
        await client.end();
        return;
      } catch (err) {
        console.log(`FAILED: user=postgres password="${pw}" database="${db}": Code ${err.code} - ${err.message}`);
      }
    }
  }
}

probe();
