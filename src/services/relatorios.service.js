const relatoriosRepository = require('../repositories/relatorios.repository');

async function obterReceitas(filters) {
  return await relatoriosRepository.getReceitas(filters);
}

async function obterDespesas(filters) {
  return await relatoriosRepository.getDespesas(filters);
}

async function obterFinanceiroPorImovel(filters) {
  return await relatoriosRepository.getFinanceiroPorImovel(filters);
}

async function obterInadimplencia(filters) {
  return await relatoriosRepository.getInadimplencia(filters);
}

async function obterContratos(filters) {
  return await relatoriosRepository.getContratos(filters);
}

async function obterOcupacao(filters) {
  return await relatoriosRepository.getOcupacao(filters);
}

async function obterImoveis(filters) {
  return await relatoriosRepository.getImoveis(filters);
}

module.exports = {
  obterReceitas,
  obterDespesas,
  obterFinanceiroPorImovel,
  obterInadimplencia,
  obterContratos,
  obterOcupacao,
  obterImoveis
};
