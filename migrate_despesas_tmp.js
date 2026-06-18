const { Client } = require('pg');
require('dotenv').config();

async function migrate() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('Connected to database successfully.');

    const sql = `
      -- Alter despesas table to add document emission and document expiration dates (both optional)
      ALTER TABLE despesas ADD COLUMN IF NOT EXISTS documento_emissao DATE;
      ALTER TABLE despesas ADD COLUMN IF NOT EXISTS documento_vencimento DATE;

      -- Create despesas_comprovantes table
      CREATE TABLE IF NOT EXISTS despesas_comprovantes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          despesa_id UUID NOT NULL REFERENCES despesas(id) ON DELETE CASCADE,
          nome_arquivo VARCHAR(255) NOT NULL,
          caminho_arquivo TEXT NOT NULL,
          criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Create despesas_recorrencias table
      CREATE TABLE IF NOT EXISTS despesas_recorrencias (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          imovel_id UUID NOT NULL REFERENCES imoveis(id) ON DELETE CASCADE,
          categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('IPTU', 'Água', 'Energia', 'Condomínio', 'Seguro', 'Internet', 'Limpeza', 'Manutenção', 'Taxa de Localização', 'Outras')),
          responsavel VARCHAR(20) NOT NULL CHECK (responsavel IN ('Locador', 'Locatário')),
          dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
          valor NUMERIC(12,2) NOT NULL,
          frequencia VARCHAR(20) NOT NULL CHECK (frequencia IN ('Mensal', 'Bimestral', 'Trimestral', 'Semestral', 'Anual')),
          observacoes TEXT,
          ativa BOOLEAN NOT NULL DEFAULT TRUE,
          ultima_geracao DATE,
          criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Create despesas_timeline table
      CREATE TABLE IF NOT EXISTS despesas_timeline (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          despesa_id UUID NOT NULL REFERENCES despesas(id) ON DELETE CASCADE,
          usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
          acao VARCHAR(100) NOT NULL,
          descricao TEXT NOT NULL,
          data_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes on despesas
      CREATE INDEX IF NOT EXISTS idx_despesas_categoria ON despesas(categoria);
      CREATE INDEX IF NOT EXISTS idx_despesas_status ON despesas(status);
      CREATE INDEX IF NOT EXISTS idx_despesas_competencia ON despesas(competencia);

      -- Create indexes on satellite tables
      CREATE INDEX IF NOT EXISTS idx_despesas_comprovantes_desp ON despesas_comprovantes(despesa_id);
      CREATE INDEX IF NOT EXISTS idx_despesas_recorrencias_imovel ON despesas_recorrencias(imovel_id);
      CREATE INDEX IF NOT EXISTS idx_despesas_timeline_desp ON despesas_timeline(despesa_id);
    `;

    console.log('Applying migrations for despesas...');
    await client.query(sql);
    console.log('Migrations applied successfully.');

  } catch (err) {
    console.error('Error applying migrations:', err);
  } finally {
    await client.end();
  }
}

migrate();
