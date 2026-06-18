-- migration_notificacoes_v2.sql
-- Fase 15 - Módulo Notificações

-- Drop antiga se existir
DROP TABLE IF EXISTS notificacoes CASCADE;

-- Criar tabela notificacoes com a nova estrutura
CREATE TABLE IF NOT EXISTS notificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    categoria VARCHAR(50) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    prioridade VARCHAR(20) NOT NULL CHECK (prioridade IN ('Baixa', 'Média', 'Alta', 'Crítica')),
    status VARCHAR(20) NOT NULL DEFAULT 'Não Lida' CHECK (status IN ('Não Lida', 'Lida', 'Arquivada')),
    entidade VARCHAR(50),
    registro_id UUID,
    lida_em TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices recomendados
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_id ON notificacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_status ON notificacoes(status);
CREATE INDEX IF NOT EXISTS idx_notificacoes_categoria ON notificacoes(categoria);
CREATE INDEX IF NOT EXISTS idx_notificacoes_prioridade ON notificacoes(prioridade);
CREATE INDEX IF NOT EXISTS idx_notificacoes_created_at ON notificacoes(created_at);
