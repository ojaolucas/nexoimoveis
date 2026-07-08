-- NexoMoveis - Schema do Banco de Dados PostgreSQL (Fase 2.5)
-- Versão 1.5

-- Drop tables for clean migration reset
DROP TABLE IF EXISTS despesas_timeline CASCADE;
DROP TABLE IF EXISTS despesas_recorrencias CASCADE;
DROP TABLE IF EXISTS despesas_comprovantes CASCADE;
DROP TABLE IF EXISTS recebimentos_timeline CASCADE;
DROP TABLE IF EXISTS recebimentos_pagamentos CASCADE;
DROP TABLE IF EXISTS contratos_timeline CASCADE;
DROP TABLE IF EXISTS contratos_renovacoes CASCADE;
DROP TABLE IF EXISTS contratos_reajustes CASCADE;
DROP TABLE IF EXISTS contratos_documentos CASCADE;
DROP TABLE IF EXISTS vistorias CASCADE;
DROP TABLE IF EXISTS manutencoes_timeline CASCADE;
DROP TABLE IF EXISTS manutencoes_anexos CASCADE;
DROP TABLE IF EXISTS manutencoes CASCADE;
DROP TABLE IF EXISTS imoveis_timeline CASCADE;
DROP TABLE IF EXISTS imoveis_fotos CASCADE;
DROP TABLE IF EXISTS imoveis_documentos CASCADE;
DROP TABLE IF EXISTS despesas CASCADE;
DROP TABLE IF EXISTS recebimentos CASCADE;
DROP TABLE IF EXISTS contratos CASCADE;
DROP TABLE IF EXISTS imoveis CASCADE;
DROP TABLE IF EXISTS locatarios_documentos CASCADE;
DROP TABLE IF EXISTS locatarios CASCADE;
DROP TABLE IF EXISTS proprietarios_documentos CASCADE;
DROP TABLE IF EXISTS proprietarios CASCADE;
DROP TABLE IF EXISTS notificacoes CASCADE;
DROP TABLE IF EXISTS auditoria_logs CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- Ativar extensão de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA: usuarios (Fase 02)
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(200) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash TEXT NOT NULL,
    perfil VARCHAR(30) NOT NULL CHECK (perfil IN ('administrador', 'operacional', 'consulta')),
    ultimo_login TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABELA: auditoria_logs (Fase 2.5)
CREATE TABLE IF NOT EXISTS auditoria_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    modulo VARCHAR(100) NOT NULL,
    acao VARCHAR(100) NOT NULL,
    registro_id UUID,
    descricao TEXT,
    ip VARCHAR(45),
    status VARCHAR(20) NOT NULL DEFAULT 'ativo',
    data_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABELA: notificacoes (Fase 15)
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

CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_id ON notificacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_status ON notificacoes(status);
CREATE INDEX IF NOT EXISTS idx_notificacoes_categoria ON notificacoes(categoria);
CREATE INDEX IF NOT EXISTS idx_notificacoes_prioridade ON notificacoes(prioridade);
CREATE INDEX IF NOT EXISTS idx_notificacoes_created_at ON notificacoes(created_at);


-- 4. TABELA: proprietarios (Fase 2.5)
CREATE TABLE IF NOT EXISTS proprietarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    tipo_pessoa VARCHAR(10) NOT NULL CHECK (tipo_pessoa IN ('PF', 'PJ')),
    nome_razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    cpf_cnpj VARCHAR(20) UNIQUE NOT NULL,
    rg VARCHAR(30),
    inscricao_estadual VARCHAR(50),
    responsavel VARCHAR(250),
    telefone VARCHAR(30) NOT NULL,
    email VARCHAR(255) NOT NULL,
    endereco TEXT, -- Armazena JSON formatado em string ou endereço em texto plano
    observacoes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
    data_nascimento DATE,
    rg_orgao VARCHAR(50),
    rg_uf VARCHAR(5),
    genero VARCHAR(30),
    nacionalidade VARCHAR(100),
    estado_civil VARCHAR(50),
    profissao VARCHAR(150),
    representante_nome VARCHAR(255),
    representante_cpf VARCHAR(20),
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4.5. TABELA: proprietarios_documentos (Fase 04)
CREATE TABLE IF NOT EXISTS proprietarios_documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proprietario_id UUID NOT NULL REFERENCES proprietarios(id) ON DELETE CASCADE,
    tipo_documento VARCHAR(50) NOT NULL CHECK (tipo_documento IN ('CPF', 'RG', 'Contrato Social', 'Comprovante de Endereço', 'Escritura', 'Outros')),
    nome_arquivo VARCHAR(255) NOT NULL,
    caminho_arquivo TEXT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABELA: locatarios (Fase 2.5)
CREATE TABLE IF NOT EXISTS locatarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    tipo_pessoa VARCHAR(10) NOT NULL CHECK (tipo_pessoa IN ('PF', 'PJ')),
    nome_razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    cpf_cnpj VARCHAR(20) UNIQUE NOT NULL,
    rg VARCHAR(30),
    inscricao_estadual VARCHAR(50),
    responsavel VARCHAR(250),
    telefone VARCHAR(30) NOT NULL,
    email VARCHAR(255) NOT NULL,
    endereco TEXT,
    observacoes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
    data_nascimento DATE,
    rg_orgao VARCHAR(50),
    rg_uf VARCHAR(5),
    genero VARCHAR(30),
    nacionalidade VARCHAR(100),
    estado_civil VARCHAR(50),
    profissao VARCHAR(150),
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5.5. TABELA: locatarios_documentos (Fase 05)
CREATE TABLE IF NOT EXISTS locatarios_documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    locatario_id UUID NOT NULL REFERENCES locatarios(id) ON DELETE CASCADE,
    tipo_documento VARCHAR(50) NOT NULL CHECK (tipo_documento IN ('CPF', 'RG', 'CNPJ', 'Contrato Social', 'Comprovante de Endereço', 'Outros')),
    nome_arquivo VARCHAR(255) NOT NULL,
    caminho_arquivo TEXT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABELA: imoveis (Fase 2.5)
CREATE TABLE IF NOT EXISTS imoveis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('Galpão', 'Casa', 'Apartamento', 'Sala Comercial', 'Loja', 'Terreno', 'Galeria Comercial', 'Prédio Comercial')),
    proprietario_id UUID NOT NULL REFERENCES proprietarios(id) ON DELETE RESTRICT,
    endereco TEXT NOT NULL,
    area_total NUMERIC(12,2) NOT NULL,
    valor_locacao NUMERIC(12,2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Disponível' CHECK (status IN ('Disponível', 'Alugado', 'Reservado', 'Em Manutenção', 'Inativo')),
    observacoes TEXT,
    foto_principal TEXT,
    quartos INTEGER DEFAULT 0,
    banheiros INTEGER DEFAULT 0,
    vagas_garagem INTEGER DEFAULT 0,
    mobiliado VARCHAR(30) DEFAULT 'Não informado',
    valor_condominio NUMERIC(12,2) DEFAULT 0,
    aceita_pet VARCHAR(30) DEFAULT 'Não informado',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABELA: contratos (Fase 2.5)
CREATE TABLE IF NOT EXISTS contratos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_contrato VARCHAR(50) UNIQUE NOT NULL,
    imovel_id UUID NOT NULL REFERENCES imoveis(id) ON DELETE RESTRICT,
    locatario_id UUID NOT NULL REFERENCES locatarios(id) ON DELETE RESTRICT,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    valor_mensal NUMERIC(12,2) NOT NULL,
    dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
    caucao NUMERIC(12,2),
    garantia VARCHAR(50) NOT NULL,
    indice_reajuste VARCHAR(20) NOT NULL CHECK (indice_reajuste IN ('IPCA', 'IGPM', 'MANUAL')),
    observacoes TEXT,
    arquivo_pdf TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Encerrado', 'Cancelado')),
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABELA: recebimentos (Fase 2.5)
CREATE TABLE IF NOT EXISTS recebimentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contrato_id UUID NOT NULL REFERENCES contratos(id) ON DELETE RESTRICT,
    competencia DATE NOT NULL,
    vencimento DATE NOT NULL,
    valor_previsto NUMERIC(12,2) NOT NULL,
    valor_recebido NUMERIC(12,2),
    data_pagamento DATE,
    forma_pagamento VARCHAR(50) CHECK (forma_pagamento IN ('PIX', 'Transferência', 'Dinheiro', 'Boleto', 'Cartão', 'Outros') OR forma_pagamento IS NULL),
    observacoes TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'A Vencer' CHECK (status IN ('A Vencer', 'Pago', 'Parcial', 'Vencido', 'Cancelado')),
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. TABELA: despesas (Fase 2.5)
CREATE TABLE IF NOT EXISTS despesas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imovel_id UUID NOT NULL REFERENCES imoveis(id) ON DELETE RESTRICT,
    categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('IPTU', 'Água', 'Energia', 'Condomínio', 'Seguro', 'Internet', 'Limpeza', 'Manutenção', 'Taxa de Localização', 'Outras')),
    responsavel VARCHAR(20) NOT NULL CHECK (responsavel IN ('Locador', 'Locatário')),
    competencia DATE NOT NULL,
    vencimento DATE NOT NULL,
    valor NUMERIC(12,2) NOT NULL,
    data_pagamento DATE,
    observacoes TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'A Vencer' CHECK (status IN ('A Vencer', 'Pago', 'Vencido', 'Cancelado')),
    recorrente BOOLEAN NOT NULL DEFAULT FALSE,
    documento_emissao DATE,
    documento_vencimento DATE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. TABELA: imoveis_documentos (Fase 06)
CREATE TABLE IF NOT EXISTS imoveis_documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imovel_id UUID NOT NULL REFERENCES imoveis(id) ON DELETE CASCADE,
    tipo_documento VARCHAR(50) NOT NULL CHECK (tipo_documento IN ('Escritura', 'IPTU', 'Alvará', 'AVCB', 'Planta', 'Seguro', 'Outros')),
    nome_arquivo VARCHAR(255) NOT NULL,
    caminho_arquivo TEXT NOT NULL,
    data_emissao DATE,
    data_vencimento DATE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. TABELA: imoveis_fotos (Fase 06)
CREATE TABLE IF NOT EXISTS imoveis_fotos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imovel_id UUID NOT NULL REFERENCES imoveis(id) ON DELETE CASCADE,
    caminho_arquivo TEXT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 12. TABELA: imoveis_timeline (Fase 06)
CREATE TABLE IF NOT EXISTS imoveis_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imovel_id UUID NOT NULL REFERENCES imoveis(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    acao VARCHAR(100) NOT NULL,
    descricao TEXT NOT NULL,
    data_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 13. TABELA: manutencoes (Fase 10)
CREATE TABLE IF NOT EXISTS manutencoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    imovel_id UUID NOT NULL REFERENCES imoveis(id) ON DELETE RESTRICT,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('Preventiva', 'Corretiva', 'Emergencial', 'Melhoria', 'Inspeção')),
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    data_solicitacao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_prevista DATE,
    data_inicio DATE,
    data_conclusao DATE,
    responsavel VARCHAR(255) NOT NULL,
    fornecedor_nome VARCHAR(255),
    fornecedor_telefone VARCHAR(30),
    fornecedor_email VARCHAR(255),
    fornecedor_observacoes TEXT,
    valor_previsto NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    valor_real NUMERIC(12,2) DEFAULT 0.00,
    observacoes TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'Planejada' CHECK (status IN ('Planejada', 'Em Andamento', 'Concluída', 'Cancelada')),
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 13.5. TABELA: manutencoes_anexos (Fase 10)
CREATE TABLE IF NOT EXISTS manutencoes_anexos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manutencao_id UUID NOT NULL REFERENCES manutencoes(id) ON DELETE CASCADE,
    tipo_anexo VARCHAR(50) NOT NULL CHECK (tipo_anexo IN ('Orçamentos', 'Notas Fiscais', 'Fotos', 'Laudos', 'Relatórios', 'Outros')),
    nome_arquivo VARCHAR(255) NOT NULL,
    caminho_arquivo TEXT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 13.6. TABELA: manutencoes_timeline (Fase 10)
CREATE TABLE IF NOT EXISTS manutencoes_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manutencao_id UUID NOT NULL REFERENCES manutencoes(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    acao VARCHAR(100) NOT NULL,
    descricao TEXT NOT NULL,
    data_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 14. TABELA: vistorias (Fase 06 - Básica)
CREATE TABLE IF NOT EXISTS vistorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imovel_id UUID NOT NULL REFERENCES imoveis(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('Entrada', 'Saída')),
    data DATE NOT NULL,
    responsavel VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 15. TABELA: contratos_documentos (Fase 07)
CREATE TABLE IF NOT EXISTS contratos_documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contrato_id UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
    tipo_documento VARCHAR(50) NOT NULL CHECK (tipo_documento IN ('Contrato Assinado', 'Aditivo', 'Outros')),
    nome_arquivo VARCHAR(255) NOT NULL,
    caminho_arquivo TEXT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 16. TABELA: contratos_reajustes (Fase 07)
CREATE TABLE IF NOT EXISTS contratos_reajustes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contrato_id UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
    data_reajuste DATE NOT NULL DEFAULT CURRENT_DATE,
    indice VARCHAR(20) NOT NULL CHECK (indice IN ('IPCA', 'IGPM', 'Manual')),
    percentual NUMERIC(5,2) NOT NULL,
    valor_anterior NUMERIC(12,2) NOT NULL,
    novo_valor NUMERIC(12,2) NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 17. TABELA: contratos_renovacoes (Fase 07)
CREATE TABLE IF NOT EXISTS contratos_renovacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contrato_origem_id UUID REFERENCES contratos(id) ON DELETE SET NULL,
    contrato_destino_id UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
    data_renovacao DATE NOT NULL DEFAULT CURRENT_DATE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 18. TABELA: contratos_timeline (Fase 07)
CREATE TABLE IF NOT EXISTS contratos_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contrato_id UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    acao VARCHAR(100) NOT NULL,
    descricao TEXT NOT NULL,
    data_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 19. TABELA: recebimentos_pagamentos (Fase 08)
CREATE TABLE IF NOT EXISTS recebimentos_pagamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recebimento_id UUID NOT NULL REFERENCES recebimentos(id) ON DELETE CASCADE,
    valor NUMERIC(12,2) NOT NULL,
    data_pagamento DATE NOT NULL,
    forma_pagamento VARCHAR(50) NOT NULL CHECK (forma_pagamento IN ('PIX', 'Transferência', 'Dinheiro', 'Boleto', 'Cartão', 'Outros')),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    observacoes TEXT,
    estornado BOOLEAN NOT NULL DEFAULT FALSE,
    data_estorno TIMESTAMP,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 20. TABELA: recebimentos_timeline (Fase 08)
CREATE TABLE IF NOT EXISTS recebimentos_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recebimento_id UUID NOT NULL REFERENCES recebimentos(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    acao VARCHAR(100) NOT NULL,
    descricao TEXT NOT NULL,
    data_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 21. TABELA: despesas_comprovantes (Fase 09)
CREATE TABLE IF NOT EXISTS despesas_comprovantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    despesa_id UUID NOT NULL REFERENCES despesas(id) ON DELETE CASCADE,
    nome_arquivo VARCHAR(255) NOT NULL,
    caminho_arquivo TEXT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 22. TABELA: despesas_recorrencias (Fase 09)
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

-- 23. TABELA: despesas_timeline (Fase 09)
CREATE TABLE IF NOT EXISTS despesas_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    despesa_id UUID NOT NULL REFERENCES despesas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    acao VARCHAR(100) NOT NULL,
    descricao TEXT NOT NULL,
    data_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 24. Migração e ajuste de constraint de status do imóvel
ALTER TABLE imoveis DROP CONSTRAINT IF EXISTS imoveis_status_check;
UPDATE imoveis SET status = 'Em Manutenção' WHERE status = 'Manutenção';
ALTER TABLE imoveis ADD CONSTRAINT imoveis_status_check CHECK (status IN ('Disponível', 'Alugado', 'Reservado', 'Em Manutenção', 'Inativo'));

