const calendarioRepository = require('../repositories/calendario.repository');

/** Mapeamento de cores por tipo de evento */
const CORES = {
  Contrato: '#3b82f6', // azul
  Recebimento: '#10b981', // verde
  Despesa: '#ef4444', // vermelho
  Manutencao: '#f59e0b', // laranja
  Vistoria: '#8b5cf6', // roxo
  Documento: '#fbbf24', // amarelo (para IPTU, Alvará, etc.)
};

/**
 * Busca eventos aplicando filtros e adicionando a cor ao retorno.
 */
async function listarEventos(filtros, pagination = { limit: 100, offset: 0 }) {
  const eventos = await calendarioRepository.buscarEventos({
    filters: filtros,
    limit: pagination.limit,
    offset: pagination.offset,
    order: 'data_inicio ASC',
  });

  // Enriquecer com cor
  const eventosComCor = eventos.map((e) => ({
    ...e,
    cor: CORES[e.tipo] || '#6b7280', // cinza padrão
  }));

  return eventosComCor;
}

/** Contagem de eventos atrasados */
async function contarAtrasados() {
  const total = await calendarioRepository.contarEventosAtrasados();
  return total;
}

/** Contagem de eventos por período (usado nas visualizações mensal/semanal/diária) */
async function contarPorPeriodo(inicio, fim) {
  const total = await calendarioRepository.contarEventosPorPeriodo(inicio, fim);
  return total;
}

/** Obter detalhes de um evento específico (usado no modal) */
async function obterDetalhes(eventoId) {
  const eventos = await calendarioRepository.buscarEventos({ filters: { evento_id: eventoId }, limit: 1, offset: 0 });
  const evento = eventos[0] || null;
  return evento;
}

module.exports = {
  listarEventos,
  contarAtrasados,
  contarPorPeriodo,
  obterDetalhes,
  CORES,
};
