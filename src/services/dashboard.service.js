const db = require('../config/database');
const auditoriaService = require('./auditoria.service');

/**
 * Get dashboard cards summary
 */
async function getCards() {
  const currentMonthQuery = `
    SELECT 
      (SELECT COUNT(id) FROM imoveis WHERE status != 'Inativo') AS total_imoveis,
      (SELECT COUNT(id) FROM imoveis WHERE status = 'Alugado') AS alugados,
      (SELECT COUNT(id) FROM imoveis WHERE status = 'Disponível') AS disponiveis,
      (SELECT COUNT(id) FROM contratos WHERE status = 'Ativo') AS contratos_ativos,
      (
        SELECT COALESCE(SUM(valor_previsto), 0) 
        FROM recebimentos 
        WHERE status != 'Cancelado' 
          AND EXTRACT(MONTH FROM vencimento) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(YEAR FROM vencimento) = EXTRACT(YEAR FROM CURRENT_DATE)
      ) AS receita_prevista,
      (
        SELECT COALESCE(SUM(valor_recebido), 0) 
        FROM recebimentos 
        WHERE status IN ('Pago', 'Parcial')
          AND EXTRACT(MONTH FROM data_pagamento) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(YEAR FROM data_pagamento) = EXTRACT(YEAR FROM CURRENT_DATE)
      ) AS receita_recebida,
      (
        SELECT COALESCE(SUM(valor_previsto - COALESCE(valor_recebido, 0)), 0) 
        FROM recebimentos 
        WHERE status = 'Vencido'
      ) AS inadimplencia,
      (
        SELECT COALESCE(SUM(valor), 0) 
        FROM despesas 
        WHERE status != 'Cancelado'
          AND EXTRACT(MONTH FROM vencimento) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(YEAR FROM vencimento) = EXTRACT(YEAR FROM CURRENT_DATE)
      ) AS despesas_mes
  `;

  const result = await db.query(currentMonthQuery);
  const row = result.rows[0];

  return {
    total_imoveis: parseInt(row.total_imoveis, 10),
    alugados: parseInt(row.alugados, 10),
    disponiveis: parseInt(row.disponiveis, 10),
    contratos_ativos: parseInt(row.contratos_ativos, 10),
    receita_prevista: parseFloat(row.receita_prevista),
    receita_recebida: parseFloat(row.receita_recebida),
    inadimplencia: parseFloat(row.inadimplencia),
    despesas_mes: parseFloat(row.despesas_mes)
  };
}

/**
 * Get revenues vs expenses for last 12 months
 */
async function getReceitaDespesa() {
  const query = `
    WITH meses AS (
      SELECT TO_CHAR(m, 'MM/YYYY') AS mes_ano, m AS date_val
      FROM generate_series(
        CURRENT_DATE - INTERVAL '11 months',
        CURRENT_DATE,
        INTERVAL '1 month'
      ) AS m
    ),
    receitas AS (
      SELECT 
        TO_CHAR(data_pagamento, 'MM/YYYY') AS mes_ano,
        SUM(COALESCE(valor_recebido, 0)) AS total_recebido
      FROM recebimentos
      WHERE status IN ('Pago', 'Parcial') AND data_pagamento >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(data_pagamento, 'MM/YYYY')
    ),
    despesas_pagas AS (
      SELECT 
        TO_CHAR(data_pagamento, 'MM/YYYY') AS mes_ano,
        SUM(COALESCE(valor, 0)) AS total_despesas
      FROM despesas
      WHERE status = 'Pago' AND data_pagamento >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(data_pagamento, 'MM/YYYY')
    )
    SELECT 
      m.mes_ano,
      COALESCE(r.total_recebido, 0) AS receita,
      COALESCE(d.total_despesas, 0) AS despesa
    FROM meses m
    LEFT JOIN receitas r ON m.mes_ano = r.mes_ano
    LEFT JOIN despesas_pagas d ON m.mes_ano = d.mes_ano
    ORDER BY m.date_val ASC
  `;

  const result = await db.query(query);
  return {
    labels: result.rows.map(r => r.mes_ano),
    receitas: result.rows.map(r => parseFloat(r.receita)),
    despesas: result.rows.map(r => parseFloat(r.despesa))
  };
}

/**
 * Get property occupation count
 */
async function getOcupacao() {
  const query = `
    SELECT status, COUNT(id) AS total
    FROM imoveis
    WHERE status != 'Inativo'
    GROUP BY status
  `;
  const result = await db.query(query);

  const dataMap = {
    'Alugado': 0,
    'Disponível': 0,
    'Reservado': 0,
    'Manutenção': 0
  };

  result.rows.forEach(r => {
    if (dataMap[r.status] !== undefined) {
      dataMap[r.status] = parseInt(r.total, 10);
    }
  });

  return {
    labels: Object.keys(dataMap),
    valores: Object.values(dataMap)
  };
}

/**
 * Get total vencido per month for last 12 months (Inadimplência line chart)
 */
async function getInadimplencia() {
  const query = `
    WITH meses AS (
      SELECT TO_CHAR(m, 'MM/YYYY') AS mes_ano, m AS date_val
      FROM generate_series(
        CURRENT_DATE - INTERVAL '11 months',
        CURRENT_DATE,
        INTERVAL '1 month'
      ) AS m
    ),
    vencidos AS (
      SELECT 
        TO_CHAR(vencimento, 'MM/YYYY') AS mes_ano,
        SUM(valor_previsto - COALESCE(valor_recebido, 0)) AS total_vencido
      FROM recebimentos
      WHERE status = 'Vencido' AND vencimento >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(vencimento, 'MM/YYYY')
    )
    SELECT 
      m.mes_ano,
      COALESCE(v.total_vencido, 0) AS valor
    FROM meses m
    LEFT JOIN vencidos v ON m.mes_ano = v.mes_ano
    ORDER BY m.date_val ASC
  `;
  const result = await db.query(query);
  return {
    labels: result.rows.map(r => r.mes_ano),
    valores: result.rows.map(r => parseFloat(r.valor))
  };
}

/**
 * Get contract count status
 */
async function getContratos() {
  const query = `
    SELECT status, COUNT(id) AS total
    FROM contratos
    GROUP BY status
  `;
  const result = await db.query(query);

  const dataMap = {
    'Ativo': 0,
    'Encerrado': 0,
    'Cancelado': 0
  };

  result.rows.forEach(r => {
    if (dataMap[r.status] !== undefined) {
      dataMap[r.status] = parseInt(r.total, 10);
    }
  });

  return {
    labels: Object.keys(dataMap),
    valores: Object.values(dataMap)
  };
}

/**
 * Get active alerts
 */
async function getAlertas() {
  const alerts = [];

  // 1. Expiring contracts
  const contratosQuery = `
    SELECT id, numero_contrato, data_fim, (data_fim - CURRENT_DATE) AS dias_restantes
    FROM contratos
    WHERE status = 'Ativo' 
      AND data_fim - CURRENT_DATE IN (90, 60, 30, 15, 7)
  `;
  const resContratos = await db.query(contratosQuery);
  resContratos.rows.forEach(c => {
    alerts.push({
      id: `ctr-${c.id}-${c.dias_restantes}`,
      type: c.dias_restantes <= 15 ? 'danger' : 'warning',
      text: `Contrato nº ${c.numero_contrato} vence em ${c.dias_restantes} dias (${c.data_fim.toISOString().split('T')[0]}).`
    });
  });

  // 2. Pending despesas (Vencendo/Vencidas) and Documents (IPTU, Seguro, Alvará, AVCB)
  const despesasQuery = `
    SELECT id, categoria, vencimento, valor, observacoes, (vencimento - CURRENT_DATE) AS dias
    FROM despesas
    WHERE status = 'A Vencer'
  `;
  const resDespesas = await db.query(despesasQuery);
  resDespesas.rows.forEach(d => {
    const dataVenc = d.vencimento.toISOString().split('T')[0];
    const obs = (d.observacoes || '').toLowerCase();
    const cat = d.categoria;

    // Check if it is a document type
    let docType = null;
    if (cat === 'IPTU') docType = 'IPTU';
    else if (cat === 'Seguro') docType = 'Seguro';
    else if (cat === 'Taxa de Localização' || obs.includes('alvará') || obs.includes('alvara')) docType = 'Alvará';
    else if (obs.includes('avcb')) docType = 'AVCB';

    if (d.dias < 0) {
      if (docType) {
        alerts.push({
          id: `doc-vencido-${d.id}`,
          type: 'danger',
          text: `Documento ${docType} vencido desde ${dataVenc} (Valor: R$ ${d.valor}).`
        });
      } else {
        alerts.push({
          id: `desp-vencida-${d.id}`,
          type: 'danger',
          text: `Despesa de ${d.categoria} vencida desde ${dataVenc} (Valor: R$ ${d.valor}).`
        });
      }
    } else {
      const maxDays = docType ? 90 : 7;
      if (d.dias <= maxDays) {
        if (docType) {
          alerts.push({
            id: `doc-vencendo-${d.id}`,
            type: 'warning',
            text: `Documento ${docType} vencendo em ${d.dias} dias (${dataVenc}) (Valor: R$ ${d.valor}).`
          });
        } else {
          alerts.push({
            id: `desp-vencendo-${d.id}`,
            type: 'warning',
            text: `Despesa de ${d.categoria} vencendo em ${d.dias} dias (${dataVenc}) (Valor: R$ ${d.valor}).`
          });
        }
      }
    }
  });

  // 3. Recebimentos em atraso
  const recebimentosQuery = `
    SELECT r.id, r.vencimento, r.valor_previsto, c.numero_contrato
    FROM recebimentos r
    JOIN contratos c ON r.contrato_id = c.id
    WHERE r.status = 'Vencido'
  `;
  const resRecebimentos = await db.query(recebimentosQuery);
  resRecebimentos.rows.forEach(r => {
    alerts.push({
      id: `rec-atraso-${r.id}`,
      type: 'danger',
      text: `Aluguel vencido (Contrato: ${r.numero_contrato}, Vencimento: ${r.vencimento.toISOString().split('T')[0]}, Previsto: R$ ${r.valor_previsto}).`
    });
  });

  // 4. Manutenções (previstas para hoje, atrasadas, em andamento há mais de 7 dias)
  const queryManut = `
    SELECT m.id, m.codigo, m.titulo, m.data_prevista, m.data_inicio, m.status,
           (m.data_prevista - CURRENT_DATE) AS dias_restantes,
           (CURRENT_DATE - m.data_prevista) AS dias_atraso,
           (CURRENT_DATE - m.data_inicio) AS dias_andamento
    FROM manutencoes m
    WHERE m.status NOT IN ('Concluída', 'Cancelada')
  `;
  const resManut = await db.query(queryManut);
  resManut.rows.forEach(m => {
    const dataPrev = m.data_prevista ? m.data_prevista.toISOString().split('T')[0] : '';
    
    if (m.status === 'Em Andamento' && m.dias_andamento > 7 && m.data_inicio) {
      alerts.push({
        id: `man-andamento-${m.id}`,
        type: 'warning',
        text: `Manutenção ${m.codigo} ("${m.titulo}") em andamento prolongado há ${m.dias_andamento} dias (início: ${m.data_inicio.toISOString().split('T')[0]}).`
      });
    }
    
    if (m.dias_restantes === 0) {
      alerts.push({
        id: `man-prevista-${m.id}`,
        type: 'warning',
        text: `Manutenção ${m.codigo} ("${m.titulo}") está prevista para hoje (${dataPrev}).`
      });
    } else if (m.dias_restantes < 0) {
      alerts.push({
        id: `man-atrasada-${m.id}`,
        type: 'danger',
        text: `Manutenção ${m.codigo} ("${m.titulo}") está atrasada há ${m.dias_atraso} dias (previsto: ${dataPrev}).`
      });
    }
  });

  // 5. Vistorias (agendadas para hoje, atrasadas, pendentes)
  const queryVist = `
    SELECT v.id, v.codigo, v.tipo, v.data_vistoria, v.status,
           (v.data_vistoria - CURRENT_DATE) AS dias_restantes,
           (CURRENT_DATE - v.data_vistoria) AS dias_atraso
    FROM vistorias v
    WHERE v.status IN ('Pendente', 'Em Andamento')
  `;
  const resVist = await db.query(queryVist);
  resVist.rows.forEach(v => {
    const dataV = v.data_vistoria ? v.data_vistoria.toISOString().split('T')[0] : '';
    if (v.dias_restantes === 0) {
      alerts.push({
        id: `vist-hoje-${v.id}`,
        type: 'warning',
        text: `Vistoria ${v.codigo} (${v.tipo}) está agendada para hoje (${dataV}).`
      });
    } else if (v.dias_restantes < 0) {
      alerts.push({
        id: `vist-atraso-${v.id}`,
        type: 'danger',
        text: `Vistoria ${v.codigo} (${v.tipo}) está atrasada há ${v.dias_atraso} dia(s) (agendada: ${dataV}).`
      });
    } else {
      alerts.push({
        id: `vist-pendente-${v.id}`,
        type: 'info',
        text: `Vistoria ${v.codigo} (${v.tipo}) está pendente para ${dataV}.`
      });
    }
  });

  return alerts;
}

/**
 * Get last 10 movements combined
 */
async function getMovimentacoes() {
  const query = `
    (SELECT 'contrato' AS tipo, 'Contrato criado: nº ' || numero_contrato AS titulo, criado_em AS data FROM contratos)
    UNION ALL
    (SELECT 'recebimento' AS tipo, 'Pagamento recebido: ID ' || id AS titulo, criado_em AS data FROM recebimentos WHERE status = 'Pago')
    UNION ALL
    (SELECT 'despesa' AS tipo, 'Despesa lançada: ' || categoria AS titulo, criado_em AS data FROM despesas)
    UNION ALL
    (SELECT 'imovel' AS tipo, 'Imóvel cadastrado: ' || nome AS titulo, criado_em AS data FROM imoveis)
    UNION ALL
    (SELECT 'manutencao' AS tipo, 'Manutenção registrada: ' || titulo AS titulo, criado_em AS data FROM manutencoes)
    UNION ALL
    (SELECT 'vistoria' AS tipo, 'Vistoria registrada: ' || tipo || ' (' || codigo || ')' AS titulo, criado_em AS data FROM vistorias)
    ORDER BY data DESC
    LIMIT 10
  `;
  
  const result = await db.query(query);
  return result.rows;
}

/**
 * Get all notifications
 */
async function getNotificacoes() {
  const query = 'SELECT * FROM notificacoes ORDER BY criado_em DESC';
  const result = await db.query(query);
  return result.rows;
}

/**
 * Mark a single notification as read
 */
async function marcarLida(id) {
  const query = 'UPDATE notificacoes SET lida = TRUE WHERE id = $1 RETURNING *';
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
}

/**
 * Mark all notifications as read
 */
async function marcarTodasLidas() {
  const query = 'UPDATE notificacoes SET lida = TRUE';
  await db.query(query);
}

/**
 * Perform global search
 */
async function buscaGlobal(q) {
  const term = `%${q}%`;
  const queries = [
    // 1. Imoveis
    db.query("SELECT id, nome || ' (' || codigo || ')' AS label, 'imovel' AS tipo FROM imoveis WHERE nome ILIKE $1 OR codigo ILIKE $1 LIMIT 5", [term]),
    // 2. Locatarios
    db.query("SELECT id, nome_razao_social AS label, 'locatario' AS tipo FROM locatarios WHERE nome_razao_social ILIKE $1 OR cpf_cnpj LIKE $1 LIMIT 5", [term]),
    // 3. Proprietarios
    db.query("SELECT id, nome_razao_social AS label, 'proprietario' AS tipo FROM proprietarios WHERE nome_razao_social ILIKE $1 OR cpf_cnpj LIKE $1 LIMIT 5", [term]),
    // 4. Contratos
    db.query("SELECT id, 'Contrato nº ' || numero_contrato AS label, 'contrato' AS tipo FROM contratos WHERE numero_contrato ILIKE $1 LIMIT 5", [term]),
    // 5. Manutencoes
    db.query("SELECT id, 'Manutenção: ' || titulo || ' (' || codigo || ')' AS label, 'manutencao' AS tipo FROM manutencoes WHERE titulo ILIKE $1 OR codigo ILIKE $1 LIMIT 5", [term]),
    // 6. Vistorias
    db.query("SELECT id, 'Vistoria: ' || tipo || ' (' || codigo || ')' AS label, 'vistoria' AS tipo FROM vistorias WHERE responsavel ILIKE $1 OR codigo ILIKE $1 LIMIT 5", [term])
  ];

  const [resImov, resLoc, resProp, resContr, resManut, resVist] = await Promise.all(queries);

  return {
    imoveis: resImov.rows,
    locatarios: resLoc.rows,
    proprietarios: resProp.rows,
    contratos: resContr.rows,
    manutencoes: resManut.rows,
    vistorias: resVist.rows
  };
}

module.exports = {
  getCards,
  getReceitaDespesa,
  getOcupacao,
  getInadimplencia,
  getContratos,
  getAlertas,
  getMovimentacoes,
  getNotificacoes,
  marcarLida,
  marcarTodasLidas,
  buscaGlobal
};
