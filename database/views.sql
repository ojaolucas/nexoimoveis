-- NexoMoveis - Visualizações (Views) do Banco de Dados (Fase 2.5)
-- Versão 1.5

-- 1. Vista resumida de contratos ativos com dados do imóvel, locatário e proprietário
CREATE OR REPLACE VIEW v_contratos_detalhes AS
SELECT 
    c.id AS contrato_id,
    c.numero_contrato,
    c.data_inicio,
    c.data_fim,
    c.valor_mensal,
    c.dia_vencimento,
    c.indice_reajuste,
    c.status AS contrato_status,
    i.id AS imovel_id,
    i.codigo AS imovel_codigo,
    i.nome AS imovel_nome,
    i.valor_locacao AS imovel_valor_locacao,
    i.status AS imovel_status,
    l.id AS locatario_id,
    l.nome_razao_social AS locatario_nome,
    l.cpf_cnpj AS locatario_cpf_cnpj,
    p.id AS proprietario_id,
    p.nome_razao_social AS proprietario_nome,
    p.cpf_cnpj AS proprietario_cpf_cnpj
FROM contratos c
JOIN imoveis i ON c.imovel_id = i.id
JOIN locatarios l ON c.locatario_id = l.id
JOIN proprietarios p ON i.proprietario_id = p.id;

-- 2. Vista financeira mensal consolidando receitas de recebimentos ativos
CREATE OR REPLACE VIEW v_resumo_financeiro_mensal AS
SELECT 
    EXTRACT(YEAR FROM competencia) AS ano,
    EXTRACT(MONTH FROM competencia) AS mes,
    SUM(valor_previsto) AS total_previsto,
    SUM(COALESCE(valor_recebido, 0)) AS total_recebido,
    SUM(CASE WHEN status = 'Vencido' THEN valor_previsto - COALESCE(valor_recebido, 0) ELSE 0 END) AS total_inadimplencia
FROM recebimentos
GROUP BY EXTRACT(YEAR FROM competencia), EXTRACT(MONTH FROM competencia);

-- Calendar events consolidated view
CREATE OR REPLACE VIEW view_calendario_eventos AS
SELECT
  ct.id AS evento_id,
  'Contrato' AS tipo,
  ct.data_inicio AS data_inicio,
  ct.data_fim AS data_fim,
  ct.imovel_id,
  NULL::uuid AS responsavel_id,
  ct.status,
  '/contratos/' || ct.id AS url_original
FROM contratos ct
WHERE ct.status <> 'Cancelado'
UNION ALL
SELECT
  rc.id AS evento_id,
  'Recebimento' AS tipo,
  rc.vencimento AS data_inicio,
  rc.vencimento AS data_fim,
  NULL::uuid AS imovel_id,
  NULL::uuid AS responsavel_id,
  rc.status,
  '/recebimentos/' || rc.id AS url_original
FROM recebimentos rc
WHERE rc.status <> 'Cancelado'
UNION ALL
SELECT
  d.id AS evento_id,
  'Despesa' AS tipo,
  d.vencimento AS data_inicio,
  d.vencimento AS data_fim,
  d.imovel_id,
  NULL::uuid AS responsavel_id,
  d.status,
  '/despesas/' || d.id AS url_original
FROM despesas d
WHERE d.status <> 'Cancelado'
UNION ALL
SELECT
  m.id AS evento_id,
  'Manutencao' AS tipo,
  m.data_prevista AS data_inicio,
  m.data_prevista AS data_fim,
  m.imovel_id,
  NULL::uuid AS responsavel_id,
  m.status,
  '/manutencoes/' || m.id AS url_original
FROM manutencoes m
WHERE m.status <> 'Cancelada';
-- Relatórios Views

-- Ocupação (taxa de ocupação)
CREATE OR REPLACE VIEW vw_relatorio_ocupacao AS
SELECT
  COUNT(*) AS total_imoveis,
  COUNT(*) FILTER (WHERE status = 'Alugado') AS alugados,
  COUNT(*) FILTER (WHERE status = 'Disponível') AS disponiveis,
  COUNT(*) FILTER (WHERE status = 'Reservado') AS reservados,
  COUNT(*) FILTER (WHERE status = 'Em Manutenção') AS manutencao,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'Alugado') / NULLIF(COUNT(*),0), 2) AS taxa_ocupacao
FROM imoveis
WHERE status <> 'Inativo';

-- Inadimplência (títulos em atraso)
CREATE OR REPLACE VIEW vw_relatorio_inadimplencia AS
SELECT r.id,
       r.vencimento,
       (r.valor_previsto - COALESCE(r.valor_recebido,0)) AS valor_aberto,
       c.numero_contrato,
       i.codigo AS imovel_codigo,
       l.nome_razao_social AS locatario,
       (CURRENT_DATE - r.vencimento) AS dias_atraso
FROM recebimentos r
JOIN contratos c ON r.contrato_id = c.id
JOIN imoveis i ON c.imovel_id = i.id
JOIN locatarios l ON c.locatario_id = l.id
WHERE r.status = 'Vencido';

-- Fluxo de Caixa (receitas vs despesas)
CREATE OR REPLACE VIEW vw_relatorio_fluxo_caixa AS
SELECT DATE_TRUNC('month', competencia) AS mes,
       SUM(CASE WHEN tipo = 'Receita' THEN valor ELSE 0 END) AS receitas,
       SUM(CASE WHEN tipo = 'Despesa' THEN valor ELSE 0 END) AS despesas,
       SUM(CASE WHEN tipo = 'Receita' THEN valor ELSE -valor END) AS saldo
FROM (
  SELECT vencimento AS competencia, valor_previsto AS valor, 'Receita' AS tipo FROM recebimentos WHERE status <> 'Cancelado'
  UNION ALL
  SELECT vencimento AS competencia, valor AS valor, 'Despesa' AS tipo FROM despesas WHERE status <> 'Cancelado'
) t
GROUP BY DATE_TRUNC('month', competencia)
ORDER BY mes;

-- Financeiro (resumo geral de receitas e inadimplência)
CREATE OR REPLACE VIEW vw_relatorio_financeiro AS
SELECT EXTRACT(YEAR FROM competencia) AS ano,
       EXTRACT(MONTH FROM competencia) AS mes,
       SUM(valor_previsto) AS total_previsto,
       SUM(COALESCE(valor_recebido,0)) AS total_recebido,
       SUM(CASE WHEN status = 'Vencido' THEN valor_previsto - COALESCE(valor_recebido,0) ELSE 0 END) AS total_inadimplente
FROM recebimentos
GROUP BY EXTRACT(YEAR FROM competencia), EXTRACT(MONTH FROM competencia);
