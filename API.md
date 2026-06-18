# API.md
# NexoMoveis - Especificação da API REST
Versão: 1.0

---

# PADRÃO DA API

Base URL:

```http
/api
```

Formato:

```json
application/json
```

Autenticação:

```text
Express Session
```

Todas as rotas (exceto login) exigem usuário autenticado.

---

# PADRÃO DE RESPOSTA

## Sucesso

```json
{
  "success": true,
  "message": "Operação realizada com sucesso",
  "data": {}
}
```

---

## Erro

```json
{
  "success": false,
  "message": "Mensagem de erro"
}
```

---

# MÓDULO AUTH

## Login

### POST

```http
/api/auth/login
```

Request

```json
{
  "login": "12345678900",
  "senha": "123456"
}
```

Response

```json
{
  "success": true,
  "usuario": {
    "id": "uuid",
    "nome": "Administrador",
    "perfil": "administrador"
  }
}
```

---

## Logout

### POST

```http
/api/auth/logout
```

---

## Usuário Logado

### GET

```http
/api/auth/me
```

---

# MÓDULO USUÁRIOS

## Listar

### GET

```http
/api/usuarios
```

Permissão:

```text
Administrador
```

---

## Buscar por ID

### GET

```http
/api/usuarios/:id
```

---

## Cadastrar

### POST

```http
/api/usuarios
```

Request

```json
{
  "nome": "",
  "cpf": "",
  "email": "",
  "senha": "",
  "perfil": "operacional"
}
```

---

## Atualizar

### PUT

```http
/api/usuarios/:id
```

---

## Resetar Senha

### PUT

```http
/api/usuarios/:id/resetar-senha
```

---

## Inativar

### PATCH

```http
/api/usuarios/:id/inativar
```

---

# MÓDULO PROPRIETÁRIOS

## Listar

### GET

```http
/api/proprietarios
```

Filtros:

```http
?busca=
?tipo=
?status=
```

---

## Buscar

### GET

```http
/api/proprietarios/:id
```

---

## Cadastrar

### POST

```http
/api/proprietarios
```

---

## Atualizar

### PUT

```http
/api/proprietarios/:id
```

---

## Inativar

### PATCH

```http
/api/proprietarios/:id/inativar
```

---

## Upload Documento

### POST

```http
/api/proprietarios/:id/documentos
```

Multipart Form Data

---

## Excluir Documento

### DELETE

```http
/api/proprietarios/documentos/:id
```

---

# MÓDULO LOCATÁRIOS

## Listar

### GET

```http
/api/locatarios
```

---

## Buscar

### GET

```http
/api/locatarios/:id
```

---

## Cadastrar

### POST

```http
/api/locatarios
```

---

## Atualizar

### PUT

```http
/api/locatarios/:id
```

---

## Inativar

### PATCH

```http
/api/locatarios/:id/inativar
```

---

## Upload Documento

### POST

```http
/api/locatarios/:id/documentos
```

---

## Excluir Documento

### DELETE

```http
/api/locatarios/documentos/:id
```

---

# MÓDULO IMÓVEIS

## Listar

### GET

```http
/api/imoveis
```

Filtros:

```http
?status=
?tipo=
?proprietario=
?busca=
```

---

## Buscar

### GET

```http
/api/imoveis/:id
```

Retorna:

- Dados
- Proprietário
- Contrato Atual
- Locatário Atual
- Próximo Recebimento
- Despesas Pendentes
- Timeline

---

## Cadastrar

### POST

```http
/api/imoveis
```

---

## Atualizar

### PUT

```http
/api/imoveis/:id
```

---

## Inativar

### PATCH

```http
/api/imoveis/:id/inativar
```

---

# Fotos

## Upload

### POST

```http
/api/imoveis/:id/fotos
```

---

## Excluir

### DELETE

```http
/api/imoveis/fotos/:id
```

---

# Documentos

## Upload

### POST

```http
/api/imoveis/:id/documentos
```

---

## Excluir

### DELETE

```http
/api/imoveis/documentos/:id
```

---

# Timeline

### GET

```http
/api/imoveis/:id/timeline
```

---

# MÓDULO CONTRATOS

## Listar

### GET

```http
/api/contratos
```

Filtros:

```http
?status=
?vencendo=
?imovel=
?locatario=
```

---

## Buscar

### GET

```http
/api/contratos/:id
```

---

## Cadastrar

### POST

```http
/api/contratos
```

Ao criar:

```text
Gerar recebimentos automaticamente
```

---

## Atualizar

### PUT

```http
/api/contratos/:id
```

---

## Renovar Contrato

### POST

```http
/api/contratos/:id/renovar
```

Ação:

```text
Encerrar contrato atual
Criar novo contrato
Gerar novos recebimentos
```

---

## Encerrar

### PATCH

```http
/api/contratos/:id/encerrar
```

---

## Upload Documento

### POST

```http
/api/contratos/:id/documentos
```

---

# MÓDULO RECEBIMENTOS

## Listar

### GET

```http
/api/recebimentos
```

Filtros:

```http
?status=
?competencia=
?contrato=
```

---

## Buscar

### GET

```http
/api/recebimentos/:id
```

---

## Registrar Pagamento

### POST

```http
/api/recebimentos/:id/pagamento
```

Request

```json
{
  "valor_recebido": 3000,
  "data_pagamento": "2026-06-01",
  "forma_pagamento": "PIX",
  "observacoes": ""
}
```

---

## Estornar

### POST

```http
/api/recebimentos/:id/estornar
```

---

# MÓDULO DESPESAS

## Listar

### GET

```http
/api/despesas
```

Filtros:

```http
?categoria=
?status=
?imovel=
```

---

## Buscar

### GET

```http
/api/despesas/:id
```

---

## Cadastrar

### POST

```http
/api/despesas
```

---

## Atualizar

### PUT

```http
/api/despesas/:id
```

---

## Registrar Pagamento

### POST

```http
/api/despesas/:id/pagamento
```

---

## Cancelar

### PATCH

```http
/api/despesas/:id/cancelar
```

---

# DESPESAS RECORRENTES

## Listar

### GET

```http
/api/despesas-recorrentes
```

---

## Cadastrar

### POST

```http
/api/despesas-recorrentes
```

---

## Atualizar

### PUT

```http
/api/despesas-recorrentes/:id
```

---

## Inativar

### PATCH

```http
/api/despesas-recorrentes/:id/inativar
```

---

# MÓDULO MANUTENÇÕES

## Listar

### GET

```http
/api/manutencoes
```

---

## Buscar

### GET

```http
/api/manutencoes/:id
```

---

## Cadastrar

### POST

```http
/api/manutencoes
```

---

## Atualizar

### PUT

```http
/api/manutencoes/:id
```

---

## Upload Fotos

### POST

```http
/api/manutencoes/:id/fotos
```

---

# MÓDULO VISTORIAS

## Listar

### GET

```http
/api/vistorias
```

---

## Buscar

### GET

```http
/api/vistorias/:id
```

---

## Cadastrar

### POST

```http
/api/vistorias
```

---

## Atualizar

### PUT

```http
/api/vistorias/:id
```

---

## Upload Fotos

### POST

```http
/api/vistorias/:id/fotos
```

---

# MÓDULO CALENDÁRIO

## Eventos

### GET

```http
/api/calendario/eventos
```

Retorna:

- Recebimentos
- Contratos
- IPTU
- Seguros
- Alvarás
- Despesas
- Vistorias

Filtros:

```http
?inicio=
?fim=
```

---

# MÓDULO DASHBOARD

## Resumo Geral

### GET

```http
/api/dashboard/resumo
```

Retorna:

```json
{
  "total_imoveis": 0,
  "alugados": 0,
  "disponiveis": 0,
  "contratos_ativos": 0,
  "receita_prevista": 0,
  "receita_recebida": 0,
  "inadimplencia": 0,
  "despesas_mes": 0
}
```

---

## Gráficos

### GET

```http
/api/dashboard/graficos
```

Retorna:

- Receitas x Despesas
- Ocupação
- Inadimplência

---

## Alertas

### GET

```http
/api/dashboard/alertas
```

Retorna:

- Contratos vencendo
- IPTU vencendo
- IPTU vencido
- Seguro vencendo
- Alvará vencendo
- Despesas vencidas

---

# MÓDULO NOTIFICAÇÕES

## Listar

### GET

```http
/api/notificacoes
```

---

## Marcar Como Lida

### PATCH

```http
/api/notificacoes/:id/lida
```

---

## Marcar Todas

### PATCH

```http
/api/notificacoes/marcar-todas
```

---

# MÓDULO RELATÓRIOS

## Imóveis

### GET

```http
/api/relatorios/imoveis
```

---

## Contratos

### GET

```http
/api/relatorios/contratos
```

---

## Receitas

### GET

```http
/api/relatorios/receitas
```

---

## Despesas

### GET

```http
/api/relatorios/despesas
```

---

## Inadimplência

### GET

```http
/api/relatorios/inadimplencia
```

---

## Ocupação

### GET

```http
/api/relatorios/ocupacao
```

---

## Fluxo de Caixa

### GET

```http
/api/relatorios/fluxo-caixa
```

---

## Manutenções

### GET

```http
/api/relatorios/manutencoes
```

---

## Vistorias

### GET

```http
/api/relatorios/vistorias
```

---

## Exportação PDF

### GET

```http
/api/relatorios/{tipo}/pdf
```

---

## Exportação Excel

### GET

```http
/api/relatorios/{tipo}/excel
```

---

# MÓDULO AUDITORIA

## Logs

### GET

```http
/api/auditoria
```

Filtros:

```http
?usuario=
?modulo=
?data_inicio=
?data_fim=
```

---

## Buscar Log

### GET

```http
/api/auditoria/:id
```

---

# BUSCA GLOBAL

### GET

```http
/api/busca-global
```

Filtros:

```http
?q=galpao
```

Pesquisar simultaneamente:

- Imóveis
- Proprietários
- Locatários
- Contratos

---

# REGRAS DA API

1. Todas as rotas devem validar sessão.
2. Todas as ações devem registrar auditoria.
3. Nenhum registro deve ser excluído fisicamente.
4. Apenas Administradores podem inativar registros.
5. Uploads devem ser armazenados no Supabase Storage.
6. Contratos criam recebimentos automaticamente.
7. Despesas recorrentes geram despesas automaticamente.
8. Alertas devem ser gerados automaticamente por tarefas agendadas (cron jobs).
9. Todas as respostas devem seguir o padrão definido neste documento.
10. Toda API deve retornar paginação para listagens.