-- NexoMoveis - Fase 14: Migration Auditoria e Logs
-- Adicionar colunas novas à tabela auditoria_logs existente

-- 1. Adicionar colunas faltantes (seguro: IF NOT EXISTS)
ALTER TABLE auditoria_logs ADD COLUMN IF NOT EXISTS perfil VARCHAR(30);
ALTER TABLE auditoria_logs ADD COLUMN IF NOT EXISTS entidade VARCHAR(100);
ALTER TABLE auditoria_logs ADD COLUMN IF NOT EXISTS dados_anteriores JSONB;
ALTER TABLE auditoria_logs ADD COLUMN IF NOT EXISTS dados_novos JSONB;
ALTER TABLE auditoria_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE auditoria_logs ADD COLUMN IF NOT EXISTS ip VARCHAR(45);

-- 2. Criar índices de performance
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_id ON auditoria_logs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_modulo ON auditoria_logs(modulo);
CREATE INDEX IF NOT EXISTS idx_auditoria_acao ON auditoria_logs(acao);
CREATE INDEX IF NOT EXISTS idx_auditoria_data_hora ON auditoria_logs(data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_registro_id ON auditoria_logs(registro_id);
