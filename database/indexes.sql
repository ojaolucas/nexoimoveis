-- NexoMoveis - Índices Recomendados (Fase 2.5)
-- Versão 1.5

-- Códigos únicos de negócios
CREATE INDEX IF NOT EXISTS idx_proprietarios_codigo ON proprietarios(codigo);
CREATE INDEX IF NOT EXISTS idx_locatarios_codigo ON locatarios(codigo);
CREATE INDEX IF NOT EXISTS idx_imoveis_codigo ON imoveis(codigo);
CREATE INDEX IF NOT EXISTS idx_contratos_numero ON contratos(numero_contrato);

-- Documentos de identificação únicos
CREATE INDEX IF NOT EXISTS idx_proprietarios_cpf_cnpj ON proprietarios(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_locatarios_cpf_cnpj ON locatarios(cpf_cnpj);

-- Chaves estrangeiras
CREATE INDEX IF NOT EXISTS idx_imoveis_proprietario ON imoveis(proprietario_id);
CREATE INDEX IF NOT EXISTS idx_contratos_imovel ON contratos(imovel_id);
CREATE INDEX IF NOT EXISTS idx_contratos_locatario ON contratos(locatario_id);
CREATE INDEX IF NOT EXISTS idx_recebimentos_contrato ON recebimentos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_despesas_imovel ON despesas(imovel_id);

-- Datas e status comuns
CREATE INDEX IF NOT EXISTS idx_recebimentos_vencimento ON recebimentos(vencimento);
CREATE INDEX IF NOT EXISTS idx_despesas_vencimento ON despesas(vencimento);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria_logs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_proprietarios_documentos_prop ON proprietarios_documentos(proprietario_id);
CREATE INDEX IF NOT EXISTS idx_locatarios_email ON locatarios(email);
CREATE INDEX IF NOT EXISTS idx_locatarios_status ON locatarios(status);
CREATE INDEX IF NOT EXISTS idx_locatarios_documentos_loc ON locatarios_documentos(locatario_id);

-- Índices específicos para Imóveis (Fase 06)
CREATE INDEX IF NOT EXISTS idx_imoveis_documentos_imovel ON imoveis_documentos(imovel_id);
CREATE INDEX IF NOT EXISTS idx_imoveis_documentos_venc ON imoveis_documentos(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_imoveis_fotos_imovel ON imoveis_fotos(imovel_id);
CREATE INDEX IF NOT EXISTS idx_imoveis_timeline_imovel ON imoveis_timeline(imovel_id);
CREATE INDEX IF NOT EXISTS idx_manutencoes_imovel ON manutencoes(imovel_id);
CREATE INDEX IF NOT EXISTS idx_manutencoes_tipo ON manutencoes(tipo);
CREATE INDEX IF NOT EXISTS idx_manutencoes_status ON manutencoes(status);
CREATE INDEX IF NOT EXISTS idx_manutencoes_data_prevista ON manutencoes(data_prevista);
CREATE INDEX IF NOT EXISTS idx_manutencoes_data_conclusao ON manutencoes(data_conclusao);
CREATE INDEX IF NOT EXISTS idx_manutencoes_anexos_manut ON manutencoes_anexos(manutencao_id);
CREATE INDEX IF NOT EXISTS idx_manutencoes_timeline_manut ON manutencoes_timeline(manutencao_id);
CREATE INDEX IF NOT EXISTS idx_vistorias_imovel ON vistorias(imovel_id);

-- Índices específicos para Contratos (Fase 07)
CREATE INDEX IF NOT EXISTS idx_contratos_documentos_contr ON contratos_documentos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_contratos_reajustes_contr ON contratos_reajustes(contrato_id);
CREATE INDEX IF NOT EXISTS idx_contratos_renovacoes_orig ON contratos_renovacoes(contrato_origem_id);
CREATE INDEX IF NOT EXISTS idx_contratos_renovacoes_dest ON contratos_renovacoes(contrato_destino_id);
CREATE INDEX IF NOT EXISTS idx_contratos_timeline_contr ON contratos_timeline(contrato_id);

-- Índices específicos para Recebimentos (Fase 08)
CREATE INDEX IF NOT EXISTS idx_recebimentos_pagamentos_rec ON recebimentos_pagamentos(recebimento_id);
CREATE INDEX IF NOT EXISTS idx_recebimentos_timeline_rec ON recebimentos_timeline(recebimento_id);

-- Índices específicos para Despesas (Fase 09)
CREATE INDEX IF NOT EXISTS idx_despesas_categoria ON despesas(categoria);
CREATE INDEX IF NOT EXISTS idx_despesas_status ON despesas(status);
CREATE INDEX IF NOT EXISTS idx_despesas_competencia ON despesas(competencia);
CREATE INDEX IF NOT EXISTS idx_despesas_comprovantes_desp ON despesas_comprovantes(despesa_id);
CREATE INDEX IF NOT EXISTS idx_despesas_recorrencias_imovel ON despesas_recorrencias(imovel_id);
CREATE INDEX IF NOT EXISTS idx_despesas_timeline_desp ON despesas_timeline(despesa_id);

