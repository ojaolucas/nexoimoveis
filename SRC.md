# SRC.md
# NexoMoveis - Estrutura Oficial do Projeto
Versão: 1.0

---

# OBJETIVO

Este documento define a estrutura completa de diretórios e arquivos do sistema NexoMoveis.

Toda implementação deverá seguir exatamente esta organização.

A arquitetura adotada é:

```text
MVC + Services + PostgreSQL
```

---

# ESTRUTURA GERAL

```text
nexomoveis/

├── docs/
│
├── src/
│
├── public/
│
├── uploads/
│
├── database/
│
├── .env
├── .gitignore
├── package.json
├── app.js
├── server.js
```

---

# DOCUMENTAÇÃO

```text
docs/

├── SRS.md
├── DATABASE.md
├── API.md
├── DESIGN.md
├── CLAUDE_INSTRUCTIONS.md
├── ROADMAP.md
├── SRC.md
```

---

# SRC

```text
src/

├── config/
├── controllers/
├── services/
├── repositories/
├── middlewares/
├── routes/
├── validators/
├── jobs/
├── utils/
├── constants/
├── templates/
```

---

# CONFIG

Responsável pelas configurações do sistema.

```text
src/config/

├── database.js
├── session.js
├── multer.js
├── supabase.js
├── cron.js
```

---

# CONTROLLERS

Responsáveis por receber requisições HTTP.

```text
src/controllers/

├── auth.controller.js
├── usuarios.controller.js
├── proprietarios.controller.js
├── locatarios.controller.js
├── imoveis.controller.js
├── contratos.controller.js
├── recebimentos.controller.js
├── despesas.controller.js
├── manutencoes.controller.js
├── vistorias.controller.js
├── dashboard.controller.js
├── calendario.controller.js
├── notificacoes.controller.js
├── relatorios.controller.js
├── auditoria.controller.js
├── buscaGlobal.controller.js
```

---

# SERVICES

Responsáveis pela regra de negócio.

```text
src/services/

├── auth.service.js
├── usuarios.service.js
├── proprietarios.service.js
├── locatarios.service.js
├── imoveis.service.js
├── contratos.service.js
├── recebimentos.service.js
├── despesas.service.js
├── manutencoes.service.js
├── vistorias.service.js
├── dashboard.service.js
├── calendario.service.js
├── notificacoes.service.js
├── relatorios.service.js
├── auditoria.service.js
├── buscaGlobal.service.js
```

---

# REPOSITORIES

Camada responsável pelo acesso ao banco.

Todas as consultas SQL devem ficar aqui.

```text
src/repositories/

├── usuarios.repository.js
├── proprietarios.repository.js
├── locatarios.repository.js
├── imoveis.repository.js
├── contratos.repository.js
├── recebimentos.repository.js
├── despesas.repository.js
├── manutencoes.repository.js
├── vistorias.repository.js
├── notificacoes.repository.js
├── auditoria.repository.js
```

---

# MIDDLEWARES

```text
src/middlewares/

├── auth.middleware.js
├── permission.middleware.js
├── upload.middleware.js
├── error.middleware.js
├── audit.middleware.js
```

---

# ROTAS

```text
src/routes/

├── auth.routes.js
├── usuarios.routes.js
├── proprietarios.routes.js
├── locatarios.routes.js
├── imoveis.routes.js
├── contratos.routes.js
├── recebimentos.routes.js
├── despesas.routes.js
├── manutencoes.routes.js
├── vistorias.routes.js
├── dashboard.routes.js
├── calendario.routes.js
├── notificacoes.routes.js
├── relatorios.routes.js
├── auditoria.routes.js
├── buscaGlobal.routes.js
├── index.js
```

---

# VALIDATORS

Validações de entrada.

```text
src/validators/

├── cpf.validator.js
├── cnpj.validator.js
├── email.validator.js
├── usuario.validator.js
├── proprietario.validator.js
├── locatario.validator.js
├── imovel.validator.js
├── contrato.validator.js
├── recebimento.validator.js
├── despesa.validator.js
├── manutencao.validator.js
├── vistoria.validator.js
```

---

# JOBS

Tarefas automáticas.

```text
src/jobs/

├── gerarRecebimentos.job.js
├── gerarDespesasRecorrentes.job.js
├── gerarNotificacoes.job.js
├── verificarContratos.job.js
├── verificarDocumentos.job.js
├── verificarDespesas.job.js
```

---

# UTILS

Funções auxiliares.

```text
src/utils/

├── formatCurrency.js
├── formatDate.js
├── generateCode.js
├── pagination.js
├── uploadFile.js
├── response.js
├── logger.js
```

---

# CONSTANTS

Valores fixos do sistema.

```text
src/constants/

├── perfis.js
├── statusImoveis.js
├── statusContratos.js
├── statusDespesas.js
├── tiposImoveis.js
├── categoriasDespesas.js
├── formasPagamento.js
```

---

# TEMPLATES

Arquivos HTML utilizados para PDF e relatórios.

```text
src/templates/

├── relatorioReceitas.html
├── relatorioDespesas.html
├── relatorioContratos.html
├── relatorioImoveis.html
├── relatorioInadimplencia.html
```

---

# PUBLIC

Arquivos públicos.

```text
public/

├── css/
├── js/
├── img/
├── icons/
```

---

# CSS

```text
public/css/

├── variables.css
├── reset.css
├── global.css
├── layout.css
├── sidebar.css
├── navbar.css
├── dashboard.css
├── forms.css
├── tables.css
├── cards.css
├── modals.css
├── darkmode.css
├── responsive.css
```

---

# JAVASCRIPT

```text
public/js/

├── app.js
├── api.js
├── auth.js
├── dashboard.js
├── notificacoes.js
├── theme.js
├── buscaGlobal.js
│
├── modules/
```

---

# MODULES

```text
public/js/modules/

├── imoveis.js
├── proprietarios.js
├── locatarios.js
├── contratos.js
├── recebimentos.js
├── despesas.js
├── manutencoes.js
├── vistorias.js
├── relatorios.js
├── auditoria.js
├── calendario.js
```

---

# IMAGENS

```text
public/img/

├── logo.svg
├── logo-dark.svg
├── logo-light.svg
├── avatar-default.png
```

---

# VIEWS

HTML do sistema.

```text
views/

├── auth/
│   ├── login.html
│
├── dashboard/
│   ├── index.html
│
├── usuarios/
│
├── proprietarios/
│
├── locatarios/
│
├── imoveis/
│
├── contratos/
│
├── recebimentos/
│
├── despesas/
│
├── manutencoes/
│
├── vistorias/
│
├── relatorios/
│
├── auditoria/
│
├── calendario/
```

---

# UPLOADS

Ambiente local.

Produção utilizar Supabase Storage.

```text
uploads/

├── imoveis/
├── contratos/
├── proprietarios/
├── locatarios/
├── manutencoes/
├── vistorias/
```

---

# DATABASE

Scripts SQL.

```text
database/

├── schema.sql
├── indexes.sql
├── triggers.sql
├── views.sql
├── functions.sql
├── seeds.sql
```

---

# ARQUIVOS RAIZ

## .env

```env
PORT=3000

SESSION_SECRET=

DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=

SUPABASE_URL=
SUPABASE_KEY=
```

---

## server.js

Responsável por iniciar a aplicação.

---

## app.js

Responsável por:

```text
Express
Middlewares
Rotas
Sessões
Tratamento de Erros
```

---

# PADRÃO DE NOMENCLATURA

Controllers

```text
nome.controller.js
```

Services

```text
nome.service.js
```

Repositories

```text
nome.repository.js
```

Routes

```text
nome.routes.js
```

Validators

```text
nome.validator.js
```

---

# FLUXO MVC

```text
ROUTE

↓

CONTROLLER

↓

SERVICE

↓

REPOSITORY

↓

POSTGRESQL
```

---

# REGRA OBRIGATÓRIA

Nenhuma consulta SQL poderá ser executada diretamente nos Controllers.

Todo acesso ao banco deve seguir:

```text
Controller
→ Service
→ Repository
→ PostgreSQL
```

---

# DIRETRIZ FINAL

Esta estrutura é obrigatória para todo o desenvolvimento do NexoMoveis e deverá ser seguida integralmente em conjunto com:

- SRS.md
- DATABASE.md
- API.md
- DESIGN.md
- INSTRUCTIONS.md
- ROADMAP.md