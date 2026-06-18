# ROADMAP.md
# NexoMoveis - Plano de Desenvolvimento
Versão: 1.0

---

# OBJETIVO

Este documento define a ordem oficial de implementação do sistema NexoMoveis.

A implementação deverá seguir rigorosamente as fases abaixo.

Nenhuma fase deverá iniciar antes da conclusão da fase anterior.

---

# STATUS DO PROJETO

```text
Projeto: NexoMoveis

Tipo:
Sistema Web Interno

Arquitetura:
Node.js + Express + PostgreSQL

Frontend:
HTML + CSS + JavaScript

Banco:
PostgreSQL (Supabase)

Versão Inicial:
1.0
```

---

# FASE 01
# ESTRUTURA BASE DO PROJETO

Objetivo:

Criar toda a estrutura inicial da aplicação.

---

## Entregas

Estrutura MVC

```text
src/

config
controllers
services
routes
middlewares
models
utils
jobs

public
views
uploads
```

---

Configuração:

```text
Express
Sessões
CORS
Dotenv
Conexão PostgreSQL
Supabase
```

---

Criar:

```text
server.js
app.js
```

---

Critério de Conclusão

```text
Servidor funcionando.

Banco conectado.

Sessão ativa.
```

---

# FASE 02
# AUTENTICAÇÃO E USUÁRIOS

Objetivo:

Controlar acesso ao sistema.

---

## Funcionalidades

Login

```text
CPF ou Email
```

Senha

```text
bcrypt
```

Logout

Usuário logado

Reset de senha

---

## Perfis

Administrador

Operacional

Consulta

---

## Permissões

Implementar middleware de autorização.

---

## Auditoria

Registrar:

```text
Login
Logout
Reset de senha
```

---

Critério de Conclusão

```text
Login funcional.

Controle de acesso funcional.
```

---

# FASE 03
# DASHBOARD INICIAL

Objetivo:

Criar a tela principal.

---

## Cards

Total de imóveis

Imóveis alugados

Imóveis disponíveis

Contratos ativos

Receita prevista

Receita recebida

Inadimplência

Despesas do mês

---

## Alertas

Contratos vencendo

IPTU vencendo

Seguro vencendo

Alvará vencendo

Despesas vencidas

---

## Gráficos

Receitas x Despesas

Ocupação

Inadimplência

---

Critério de Conclusão

```text
Dashboard exibindo dados reais.
```

---

# FASE 04
# MÓDULO PROPRIETÁRIOS

Objetivo:

Cadastrar proprietários.

---

## Funcionalidades

Cadastrar

Editar

Consultar

Inativar

Upload de documentos

---

Critério de Conclusão

```text
CRUD completo.
```

---

# FASE 05
# MÓDULO LOCATÁRIOS

Objetivo:

Cadastrar locatários.

---

## Funcionalidades

Pessoa Física

Pessoa Jurídica

Documentos

Observações

---

Critério de Conclusão

```text
CRUD completo.
```

---

# FASE 06
# MÓDULO IMÓVEIS

Objetivo:

Cadastrar imóveis.

---

## Funcionalidades

Cadastro

Fotos

Documentos

Status

---

## Tipos

Galpão

Casa

Loja

Sala Comercial

Apartamento

Terreno

Galeria Comercial

Prédio Comercial

---

## Tela Completa do Imóvel

Dados Gerais

Documentos

Contratos

Recebimentos

Despesas

Manutenções

Vistorias

Timeline

---

Critério de Conclusão

```text
Ficha completa funcionando.
```

---

# FASE 07
# MÓDULO CONTRATOS

Objetivo:

Gerenciar contratos.

---

## Funcionalidades

Cadastrar

Editar

Encerrar

Renovar

Anexar PDF

---

## Reajustes

IPCA

IGPM

Manual

---

## Alertas

90 dias

60 dias

30 dias

---

Critério de Conclusão

```text
Renovação automática funcionando.
```

---

# FASE 08
# MÓDULO RECEBIMENTOS

Objetivo:

Controlar recebimentos dos aluguéis.

---

## Funcionalidades

Geração automática

Recebimento parcial

Recebimento total

Controle de atraso

Histórico

---

## Formas de Pagamento

PIX

Transferência

Dinheiro

Boleto

Cartão

Outros

---

Critério de Conclusão

```text
Recebimentos gerados automaticamente.
```

---

# FASE 09
# MÓDULO DESPESAS

Objetivo:

Controlar despesas dos imóveis.

---

## Categorias

IPTU

Água

Energia

Condomínio

Seguro

Internet

Limpeza

Manutenção

Taxa de Localização

Outras

---

## Funcionalidades

Cadastrar

Editar

Registrar pagamento

Anexar comprovantes

---

## Recorrência

Mensal

Automática

---

Critério de Conclusão

```text
Despesas recorrentes funcionando.
```

---

# FASE 10
# MÓDULO MANUTENÇÕES

Objetivo:

Histórico técnico dos imóveis.

---

## Funcionalidades

Cadastro

Fotos

Custos

Responsáveis

Observações

---

Critério de Conclusão

```text
Histórico completo disponível.
```

---

# FASE 11
# MÓDULO VISTORIAS

Objetivo:

Registrar entrada e saída dos imóveis.

---

## Funcionalidades

Checklist padrão

Fotos

Observações

---

## Tipos

Entrada

Saída

---

Critério de Conclusão

```text
Checklists funcionando.
```

---

# FASE 12
# MÓDULO CALENDÁRIO

Objetivo:

Centralizar vencimentos.

---

## Exibir

Recebimentos

Contratos

IPTU

Seguros

Alvarás

Despesas

Vistorias

---

## Modos

Mês

Semana

Dia

---

Critério de Conclusão

```text
Calendário semelhante ao Google Agenda.
```

---

# FASE 13
# SISTEMA DE NOTIFICAÇÕES

Objetivo:

Alertar usuários.

---

## Sino

Dropdown

Painel de alertas

---

## Alertas

Contrato vencendo

IPTU vencendo

IPTU vencido

Seguro vencendo

Seguro vencido

Alvará vencendo

Alvará vencido

Despesas vencidas

---

Critério de Conclusão

```text
Notificações automáticas funcionando.
```

---

# FASE 14
# AUDITORIA E LOGS

Objetivo:

Rastrear todas as ações.

---

## Registrar

Login

Logout

Cadastro

Alteração

Inativação

Pagamentos

Renovações

---

## Tela

Filtros

Pesquisa

Exportação

---

Critério de Conclusão

```text
100% das ações auditadas.
```

---

# FASE 15
# RELATÓRIOS

Objetivo:

Extrair informações gerenciais.

---

## Relatórios

Imóveis

Proprietários

Locatários

Contratos

Receitas

Despesas

Inadimplência

Fluxo de Caixa

Ocupação

Manutenções

Vistorias

---

## Exportações

PDF

Excel

---

Critério de Conclusão

```text
Todos os relatórios exportando corretamente.
```

---

# FASE 16
# RESPONSIVIDADE E DARK MODE

Objetivo:

Finalização visual.

---

## Responsividade

Desktop

Tablet

Mobile

---

## Tema

Claro

Escuro

---

Critério de Conclusão

```text
Sistema totalmente utilizável no celular.
```

---

# FASE 17
# TESTES E HOMOLOGAÇÃO

Objetivo:

Garantir estabilidade.

---

## Testes

Login

Permissões

CRUDs

Uploads

Contratos

Recebimentos

Despesas

Relatórios

Notificações

Auditoria

---

## Correções

Bugs

Performance

Layout

---

Critério de Conclusão

```text
Sistema apto para produção.
```

---

# FASE 18
# DEPLOY

Objetivo:

Publicação.

---

## Backend

Node.js

---

## Banco

Supabase PostgreSQL

---

## Variáveis

.env

---

## Segurança

Sessões

Uploads

Permissões

---

Critério de Conclusão

```text
Sistema online e operacional.
```

---

# MVP (VERSÃO 1.0)

Para colocar o sistema em operação rapidamente, os módulos mínimos obrigatórios são:

```text
✔ Login

✔ Dashboard

✔ Proprietários

✔ Locatários

✔ Imóveis

✔ Contratos

✔ Recebimentos

✔ Despesas

✔ Notificações

✔ Auditoria
```

---

# VERSÃO 1.1

Adicionar:

```text
✔ Manutenções

✔ Vistorias

✔ Calendário

✔ Relatórios Avançados
```

---

# VERSÃO 2.0

Preparação futura:

```text
✔ Multiempresa

✔ Aplicativo Mobile

✔ Assinatura Digital

✔ Integrações Bancárias

✔ Integração WhatsApp

✔ Integração E-mail
```

---

# DIRETRIZ FINAL

A implementação deve seguir rigorosamente:

```text
SRS.md
DATABASE.md
API.md
DESIGN.md
CLAUDE_INSTRUCTIONS.md
ROADMAP.md
```

Nenhuma funcionalidade deve ser criada fora do escopo documentado sem aprovação prévia.