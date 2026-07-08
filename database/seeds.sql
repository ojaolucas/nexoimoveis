-- NexoMoveis - Massa de Testes Inicial (Seeds)
-- Versão 2.0

-- 1. Inserir Usuários
-- Hash Bcrypt gerado para 'Admin@123': $2a$10$4zhl3awG5yHQL7JIwxor3OaHuCKeHfZvdYXaVn6C9tslSTnOjRLMO
INSERT INTO usuarios (id, nome, cpf, email, senha_hash, perfil, status)
VALUES (
    'a3b8c2d1-e4f5-4a6b-8c9d-0e1f2a3b4c5d',
    'Administrador Nexo',
    '12345678900',
    'admin@nexomoveis.com',
    '$2a$10$4zhl3awG5yHQL7JIwxor3OaHuCKeHfZvdYXaVn6C9tslSTnOjRLMO',
    'administrador',
    'ativo'
) ON CONFLICT (cpf) DO NOTHING;

INSERT INTO usuarios (id, nome, cpf, email, senha_hash, perfil, status)
VALUES (
    'b4c9d3e2-f5a6-5b7c-9d0e-1f2a3b4c5d6e',
    'Operador Nexo',
    '98765432100',
    'oper@nexomoveis.com.br',
    '$2a$10$vW90f6Fw6E8P1YqN/d7UleP1d5Ue173g9N7r1ZtO/8vB2tZ/H1d8O',
    'operacional',
    'ativo'
) ON CONFLICT (cpf) DO NOTHING;

-- 2. Inserir Proprietários (f1a1...)
INSERT INTO proprietarios (id, codigo, tipo_pessoa, nome_razao_social, nome_fantasia, cpf_cnpj, telefone, email, endereco, observacoes, status, data_nascimento, rg_orgao, rg_uf, genero, nacionalidade, estado_civil, profissao, representante_nome, representante_cpf)
VALUES (
    'f1a1a1a1-1111-1111-1111-111111111111',
    'PROP-001',
    'PJ',
    'Empreendimentos Imobiliários Nexo Ltda',
    'Nexo Real Estate',
    '12.345.678/0001-90',
    '(11) 98888-7777',
    'proprietario1@nexo.com',
    'Av. Paulista, 1000 - Bela Vista - São Paulo/SP',
    'Proprietário corporativo principal',
    'ativo',
    NULL,
    'SSP',
    'SP',
    'Não informado',
    'Brasileira',
    'Outro',
    'Empresa',
    'Carlos Representante',
    '111.222.333-44'
) ON CONFLICT (codigo) DO NOTHING;

INSERT INTO proprietarios (id, codigo, tipo_pessoa, nome_razao_social, nome_fantasia, cpf_cnpj, telefone, email, endereco, observacoes, status, data_nascimento, rg_orgao, rg_uf, genero, nacionalidade, estado_civil, profissao, representante_nome, representante_cpf)
VALUES (
    'f2a2a2a2-2222-2222-2222-222222222222',
    'PROP-002',
    'PF',
    'Carlos Alberto Silva',
    NULL,
    '321.654.987-00',
    '(11) 97777-6666',
    'carlos.alberto@gmail.com',
    'Rua das Palmeiras, 450 - Centro - Campinas/SP',
    'Proprietário de imóveis residenciais e salas comerciais',
    'ativo',
    '1975-04-12',
    'DETRAN',
    'SP',
    'Masculino',
    'Brasileiro',
    'Casado',
    'Engenheiro',
    NULL,
    NULL
) ON CONFLICT (codigo) DO NOTHING;

-- 3. Inserir Locatários (e1a1...)
INSERT INTO locatarios (id, codigo, tipo_pessoa, nome_razao_social, nome_fantasia, cpf_cnpj, rg, telefone, email, endereco, observacoes, status, data_nascimento, rg_orgao, rg_uf, genero, nacionalidade, estado_civil, profissao)
VALUES (
    'e1a1a1a1-1111-1111-1111-111111111111',
    'LOC-001',
    'PJ',
    'Mercado do Bairro Ltda',
    'Mercadinho Express',
    '98.765.432/0001-10',
    '123.456.789-110',
    '(11) 96666-5555',
    'financeiro@mercadinho.com.br',
    'Rua Direita, 200 - Centro - São Paulo/SP',
    'Locatário comercial do Galpão Alpha',
    'ativo',
    NULL,
    'SSP',
    'SP',
    'Não informado',
    'Brasileira',
    'Outro',
    'Comércio'
) ON CONFLICT (codigo) DO NOTHING;

INSERT INTO locatarios (id, codigo, tipo_pessoa, nome_razao_social, nome_fantasia, cpf_cnpj, rg, telefone, email, endereco, observacoes, status, data_nascimento, rg_orgao, rg_uf, genero, nacionalidade, estado_civil, profissao)
VALUES (
    'e2a2a2a2-2222-2222-2222-222222222222',
    'LOC-002',
    'PF',
    'Ana Maria Ferreira',
    NULL,
    '111.222.333-44',
    '44.555.666-X',
    '(19) 95555-4444',
    'anamaria@yahoo.com.br',
    'Av. General Flores, 78 - Botafogo - Campinas/SP',
    'Locatária residencial',
    'ativo',
    '1988-08-25',
    'SSP',
    'SP',
    'Feminino',
    'Brasileira',
    'Solteira',
    'Advogada'
) ON CONFLICT (codigo) DO NOTHING;

-- 4. Inserir Imóveis (d1a1...)
INSERT INTO imoveis (id, codigo, nome, tipo, proprietario_id, endereco, area_total, valor_locacao, status, observacoes, foto_principal, quartos, banheiros, vagas_garagem, mobiliado, valor_condominio, aceita_pet)
VALUES (
    'd1a1a1a1-1111-1111-1111-111111111111',
    'IMOV-001',
    'Galpão Industrial Alpha',
    'Galpão',
    'f1a1a1a1-1111-1111-1111-111111111111',
    'Rua das Indústrias, 500 - Distrito Industrial - Jundiaí/SP',
    1500.00,
    15000.00,
    'Alugado',
    'Galpão com pé direito duplo e docas',
    NULL,
    0,
    2,
    4,
    'Sem mobília',
    0.00,
    'Não informado'
) ON CONFLICT (codigo) DO NOTHING;

INSERT INTO imoveis (id, codigo, nome, tipo, proprietario_id, endereco, area_total, valor_locacao, status, observacoes, foto_principal, quartos, banheiros, vagas_garagem, mobiliado, valor_condominio, aceita_pet)
VALUES (
    'd2a2a2a2-2222-2222-2222-222222222222',
    'IMOV-002',
    'Sala Comercial 501',
    'Sala Comercial',
    'f2a2a2a2-2222-2222-2222-222222222222',
    'Av. Barão de Itaponã, 120 - Ed. Premium - Campinas/SP',
    45.00,
    2200.00,
    'Disponível',
    'Sala comercial com ar condicionado e 1 vaga',
    NULL,
    0,
    1,
    1,
    'Sem mobília',
    450.00,
    'Não'
) ON CONFLICT (codigo) DO NOTHING;

INSERT INTO imoveis (id, codigo, nome, tipo, proprietario_id, endereco, area_total, valor_locacao, status, observacoes, foto_principal, quartos, banheiros, vagas_garagem, mobiliado, valor_condominio, aceita_pet)
VALUES (
    'd3a3a3a3-3333-3333-3333-333333333333',
    'IMOV-003',
    'Apartamento Centro',
    'Apartamento',
    'f2a2a2a2-2222-2222-2222-222222222222',
    'Rua General Osório, 1400 - Centro - Campinas/SP',
    85.00,
    3000.00,
    'Reservado',
    'Apartamento de 2 dormitórios mobiliado',
    NULL,
    2,
    2,
    1,
    'Mobiliado',
    600.00,
    'Sim'
) ON CONFLICT (codigo) DO NOTHING;

INSERT INTO imoveis (id, codigo, nome, tipo, proprietario_id, endereco, area_total, valor_locacao, status, observacoes, foto_principal, quartos, banheiros, vagas_garagem, mobiliado, valor_condominio, aceita_pet)
VALUES (
    'd4a4a4a4-4444-4444-4444-444444444444',
    'IMOV-004',
    'Loja Shopping',
    'Loja',
    'f1a1a1a1-1111-1111-1111-111111111111',
    'Av. das Américas, 5000 - Loja 102 - Barra da Tijuca - Rio de Janeiro/RJ',
    120.00,
    8000.00,
    'Em Manutenção',
    'Loja em ponto nobre do Shopping Sul',
    NULL,
    0,
    1,
    0,
    'Sem mobília',
    1200.00,
    'Não'
) ON CONFLICT (codigo) DO NOTHING;

-- 5. Inserir Contratos (c1a1...)
-- CTR-001 (Ativo, encerra em 30 dias para disparar alerta)
INSERT INTO contratos (id, numero_contrato, imovel_id, locatario_id, data_inicio, data_fim, valor_mensal, dia_vencimento, caucao, garantia, indice_reajuste, observacoes, status)
VALUES (
    'c1a1a1a1-1111-1111-1111-111111111111',
    'CTR-001',
    'd1a1a1a1-1111-1111-1111-111111111111',
    'e1a1a1a1-1111-1111-1111-111111111111',
    CURRENT_DATE - INTERVAL '11 months',
    CURRENT_DATE + INTERVAL '30 days',
    15000.00,
    10,
    45000.00,
    'Caução',
    'IPCA',
    'Contrato comercial renovável',
    'Ativo'
) ON CONFLICT (numero_contrato) DO NOTHING;

-- CTR-002 (Encerrado)
INSERT INTO contratos (id, numero_contrato, imovel_id, locatario_id, data_inicio, data_fim, valor_mensal, dia_vencimento, caucao, garantia, indice_reajuste, observacoes, status)
VALUES (
    'c2a2a2a2-2222-2222-2222-222222222222',
    'CTR-002',
    'd3a3a3a3-3333-3333-3333-333333333333',
    'e2a2a2a2-2222-2222-2222-222222222222',
    CURRENT_DATE - INTERVAL '24 months',
    CURRENT_DATE - INTERVAL '12 months',
    2800.00,
    15,
    NULL,
    'Fiador',
    'IGPM',
    'Contrato residencial encerrado por término de prazo',
    'Encerrado'
) ON CONFLICT (numero_contrato) DO NOTHING;

-- 6. Inserir Recebimentos para CTR-001 (Últimos 12 meses, incluindo faturamento real de Junho de 2026 e uma inadimplência)
-- Pago: Últimos 11 meses
INSERT INTO recebimentos (contrato_id, competencia, vencimento, valor_previsto, valor_recebido, data_pagamento, forma_pagamento, status)
VALUES 
    ('c1a1a1a1-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '11 months', CURRENT_DATE - INTERVAL '11 months', 15000.00, 15000.00, CURRENT_DATE - INTERVAL '11 months', 'PIX', 'Pago'),
    ('c1a1a1a1-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '10 months', CURRENT_DATE - INTERVAL '10 months', 15000.00, 15000.00, CURRENT_DATE - INTERVAL '10 months', 'PIX', 'Pago'),
    ('c1a1a1a1-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '9 months', CURRENT_DATE - INTERVAL '9 months', 15000.00, 15000.00, CURRENT_DATE - INTERVAL '9 months', 'PIX', 'Pago'),
    ('c1a1a1a1-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '8 months', CURRENT_DATE - INTERVAL '8 months', 15000.00, 15000.00, CURRENT_DATE - INTERVAL '8 months', 'Boleto', 'Pago'),
    ('c1a1a1a1-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '7 months', CURRENT_DATE - INTERVAL '7 months', 15000.00, 15000.00, CURRENT_DATE - INTERVAL '7 months', 'PIX', 'Pago'),
    ('c1a1a1a1-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE - INTERVAL '6 months', 15000.00, 15000.00, CURRENT_DATE - INTERVAL '6 months', 'PIX', 'Pago'),
    ('c1a1a1a1-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '5 months', CURRENT_DATE - INTERVAL '5 months', 15000.00, 15000.00, CURRENT_DATE - INTERVAL '5 months', 'Transferência', 'Pago'),
    ('c1a1a1a1-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '4 months', CURRENT_DATE - INTERVAL '4 months', 15000.00, 15000.00, CURRENT_DATE - INTERVAL '4 months', 'PIX', 'Pago'),
    ('c1a1a1a1-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE - INTERVAL '3 months', 15000.00, 15000.00, CURRENT_DATE - INTERVAL '3 months', 'PIX', 'Pago'),
    ('c1a1a1a1-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '2 months', CURRENT_DATE - INTERVAL '2 months', 15000.00, 15000.00, CURRENT_DATE - INTERVAL '2 months', 'PIX', 'Pago');

-- Recebimento Vencido (Inadimplência - Mês anterior)
INSERT INTO recebimentos (contrato_id, competencia, vencimento, valor_previsto, valor_recebido, data_pagamento, status)
VALUES ('c1a1a1a1-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '1 month', CURRENT_DATE - INTERVAL '1 month', 15000.00, 0.00, NULL, 'Vencido');

-- Recebimento do mês atual (Metade pago, metade a vencer / previsto)
INSERT INTO recebimentos (contrato_id, competencia, vencimento, valor_previsto, valor_recebido, data_pagamento, forma_pagamento, status)
VALUES ('c1a1a1a1-1111-1111-1111-111111111111', CURRENT_DATE, CURRENT_DATE + INTERVAL '5 days', 15000.00, 15000.00, CURRENT_DATE, 'PIX', 'Pago');

-- 7. Inserir Despesas
-- Despesas pagas dos últimos 12 meses
INSERT INTO despesas (imovel_id, categoria, responsavel, competencia, vencimento, valor, data_pagamento, status, recorrente)
VALUES 
    ('d1a1a1a1-1111-1111-1111-111111111111', 'IPTU', 'Locador', CURRENT_DATE - INTERVAL '11 months', CURRENT_DATE - INTERVAL '11 months', 850.00, CURRENT_DATE - INTERVAL '11 months', 'Pago', true),
    ('d1a1a1a1-1111-1111-1111-111111111111', 'IPTU', 'Locador', CURRENT_DATE - INTERVAL '10 months', CURRENT_DATE - INTERVAL '10 months', 850.00, CURRENT_DATE - INTERVAL '10 months', 'Pago', true),
    ('d1a1a1a1-1111-1111-1111-111111111111', 'Condomínio', 'Locador', CURRENT_DATE - INTERVAL '9 months', CURRENT_DATE - INTERVAL '9 months', 1200.00, CURRENT_DATE - INTERVAL '9 months', 'Pago', true),
    ('d1a1a1a1-1111-1111-1111-111111111111', 'Energia', 'Locatário', CURRENT_DATE - INTERVAL '8 months', CURRENT_DATE - INTERVAL '8 months', 450.00, CURRENT_DATE - INTERVAL '8 months', 'Pago', false),
    ('d1a1a1a1-1111-1111-1111-111111111111', 'IPTU', 'Locador', CURRENT_DATE - INTERVAL '7 months', CURRENT_DATE - INTERVAL '7 months', 850.00, CURRENT_DATE - INTERVAL '7 months', 'Pago', true),
    ('d1a1a1a1-1111-1111-1111-111111111111', 'Seguro', 'Locador', CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE - INTERVAL '6 months', 2400.00, CURRENT_DATE - INTERVAL '6 months', 'Pago', true),
    ('d1a1a1a1-1111-1111-1111-111111111111', 'IPTU', 'Locador', CURRENT_DATE - INTERVAL '5 months', CURRENT_DATE - INTERVAL '5 months', 850.00, CURRENT_DATE - INTERVAL '5 months', 'Pago', true),
    ('d1a1a1a1-1111-1111-1111-111111111111', 'Condomínio', 'Locador', CURRENT_DATE - INTERVAL '4 months', CURRENT_DATE - INTERVAL '4 months', 1200.00, CURRENT_DATE - INTERVAL '4 months', 'Pago', true),
    ('d1a1a1a1-1111-1111-1111-111111111111', 'IPTU', 'Locador', CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE - INTERVAL '3 months', 850.00, CURRENT_DATE - INTERVAL '3 months', 'Pago', true),
    ('d1a1a1a1-1111-1111-1111-111111111111', 'Manutenção', 'Locador', CURRENT_DATE - INTERVAL '2 months', CURRENT_DATE - INTERVAL '2 months', 1500.00, CURRENT_DATE - INTERVAL '2 months', 'Pago', false),
    ('d1a1a1a1-1111-1111-1111-111111111111', 'IPTU', 'Locador', CURRENT_DATE - INTERVAL '1 month', CURRENT_DATE - INTERVAL '1 month', 850.00, CURRENT_DATE - INTERVAL '1 month', 'Pago', true);

-- Despesa do mês atual (A vencer e vencida para disparar Alertas)
INSERT INTO despesas (imovel_id, categoria, responsavel, competencia, vencimento, valor, status, recorrente)
VALUES ('d1a1a1a1-1111-1111-1111-111111111111', 'Condomínio', 'Locador', CURRENT_DATE, CURRENT_DATE + INTERVAL '5 days', 1200.00, 'A Vencer', true);

INSERT INTO despesas (imovel_id, categoria, responsavel, competencia, vencimento, valor, status, recorrente)
VALUES ('d1a1a1a1-1111-1111-1111-111111111111', 'Seguro', 'Locador', CURRENT_DATE - INTERVAL '1 month', CURRENT_DATE - INTERVAL '5 days', 2200.00, 'A Vencer', true); -- Vencimento < CURRENT_DATE, status 'A Vencer' = Vencida

-- 8. Inserir Notificações
INSERT INTO notificacoes (titulo, descricao, categoria, prioridade, status)
VALUES ('Contrato CTR-001 Próximo do Fim', 'O contrato CTR-001 do locatário Mercado do Bairro Ltda vencerá em 30 dias.', 'Alerta', 'Média', 'Não Lida');

INSERT INTO notificacoes (titulo, descricao, categoria, prioridade, status)
VALUES ('Despesa Seguro Atrasada', 'O Seguro da propriedade Galpão Industrial Alpha está vencido desde ' || (CURRENT_DATE - INTERVAL '5 days')::text, 'Financeiro', 'Alta', 'Não Lida');

-- 9. Auditoria
INSERT INTO auditoria_logs (usuario_id, modulo, acao, descricao, ip)
VALUES ('a3b8c2d1-e4f5-4a6b-8c9d-0e1f2a3b4c5d', 'Autenticação', 'Login', 'Usuário admin@nexomoveis.com realizou login com sucesso.', '127.0.0.1');
