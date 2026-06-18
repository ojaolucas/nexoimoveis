-- NexoMoveis - Gatilhos (Triggers) do Banco de Dados (Fase 2.5)
-- Versão 1.5

-- 1. Função para atualizar a coluna updated_at (usuarios)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Função para atualizar a coluna atualizado_em (entidades de negócio)
CREATE OR REPLACE FUNCTION update_atualizado_em_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at (usuarios)
DROP TRIGGER IF EXISTS trigger_update_usuarios_updated_at ON usuarios;
CREATE TRIGGER trigger_update_usuarios_updated_at
BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers para atualizado_em (entidades de negócio)
DROP TRIGGER IF EXISTS trigger_update_proprietarios_atualizado_em ON proprietarios;
CREATE TRIGGER trigger_update_proprietarios_atualizado_em
BEFORE UPDATE ON proprietarios
FOR EACH ROW EXECUTE FUNCTION update_atualizado_em_column();

DROP TRIGGER IF EXISTS trigger_update_locatarios_atualizado_em ON locatarios;
CREATE TRIGGER trigger_update_locatarios_atualizado_em
BEFORE UPDATE ON locatarios
FOR EACH ROW EXECUTE FUNCTION update_atualizado_em_column();

DROP TRIGGER IF EXISTS trigger_update_imoveis_atualizado_em ON imoveis;
CREATE TRIGGER trigger_update_imoveis_atualizado_em
BEFORE UPDATE ON imoveis
FOR EACH ROW EXECUTE FUNCTION update_atualizado_em_column();

DROP TRIGGER IF EXISTS trigger_update_contratos_atualizado_em ON contratos;
CREATE TRIGGER trigger_update_contratos_atualizado_em
BEFORE UPDATE ON contratos
FOR EACH ROW EXECUTE FUNCTION update_atualizado_em_column();
