# DESIGN.md
# NexoMoveis - Design System e Interface do Usuário
Versão: 1.0

---

# OBJETIVO

Definir o padrão visual, componentes, responsividade e experiência do usuário do sistema NexoMoveis.

O sistema deverá transmitir:

- Profissionalismo
- Organização
- Modernidade
- Simplicidade
- Rapidez operacional

Inspirado em sistemas ERP modernos, CRM e dashboards corporativos.

---

# IDENTIDADE VISUAL

## Nome

NexoMoveis

---

## Conceito da Marca

Representar:

- Conexão entre imóveis e locatários
- Gestão centralizada
- Controle patrimonial
- Segurança das informações

---

# PALETA DE CORES

## Cor Primária

```css
#478C27
```

Uso:

- Botões principais
- Links
- Cards de destaque
- Indicadores positivos

---

## Cor Secundária

```css
#001731
```

Uso:

- Sidebar
- Navbar
- Cabeçalhos
- Títulos

---

## Cor Base

```css
#F9F9F9
```

Uso:

- Fundo principal

---

## Cores Auxiliares

Sucesso

```css
#16A34A
```

Aviso

```css
#F59E0B
```

Erro

```css
#DC2626
```

Informação

```css
#2563EB
```

---

# TIPOGRAFIA

Fonte principal:

```css
Inter
```

Fallback:

```css
Arial
sans-serif
```

---

# TAMANHOS

Título Principal

```css
32px
```

Título Secundário

```css
24px
```

Subtítulo

```css
18px
```

Texto

```css
14px
```

Texto Pequeno

```css
12px
```

---

# MODO CLARO

Fundo:

```css
#F9F9F9
```

Cards:

```css
#FFFFFF
```

Texto:

```css
#111827
```

Bordas:

```css
#E5E7EB
```

---

# MODO ESCURO

Fundo:

```css
#0F172A
```

Cards:

```css
#1E293B
```

Texto:

```css
#F8FAFC
```

Bordas:

```css
#334155
```

---

# ESTRUTURA GERAL

Layout:

```text
┌───────────────────────────────┐
│ Navbar                        │
├─────────┬─────────────────────┤
│ Sidebar │ Conteúdo Principal  │
│         │                     │
│         │                     │
└─────────┴─────────────────────┘
```

---

# SIDEBAR

Largura:

```css
280px
```

---

## Menu Principal

```text
Dashboard

Imóveis

Proprietários

Locatários

Contratos

Recebimentos

Despesas

Manutenções

Vistorias

Calendário

Relatórios

Auditoria
```

---

## Rodapé Sidebar

```text
Tema Claro / Escuro

Versão do Sistema

Usuário Logado
```

---

# NAVBAR

Altura:

```css
70px
```

---

## Elementos

Lado Esquerdo

```text
Botão Menu
Busca Global
```

---

Lado Direito

```text
Notificações

Tema

Usuário
```

---

# BUSCA GLOBAL

Localização:

Navbar

Placeholder:

```text
Pesquisar imóveis, contratos, locatários...
```

Busca:

- Imóveis
- Proprietários
- Locatários
- Contratos

Resultado em dropdown.

---

# DASHBOARD

## Primeira Seção

Cards Resumo

```text
Total de Imóveis

Imóveis Alugados

Imóveis Disponíveis

Contratos Ativos
```

---

## Segunda Seção

Cards Financeiros

```text
Receita Prevista

Receita Recebida

Inadimplência

Despesas do Mês
```

---

## Terceira Seção

Gráficos

```text
Receitas x Despesas

Ocupação dos Imóveis

Inadimplência
```

Chart.js

---

## Quarta Seção

Alertas

```text
Contratos Vencendo

IPTU Vencendo

IPTU Vencido

Seguro Vencendo

Alvará Vencendo

Despesas Vencidas
```

---

# TABELAS

Padrão para todos os módulos.

---

## Cabeçalho

```text
Pesquisar

Filtros

Exportar Excel

Exportar PDF

Novo Registro
```

---

## Colunas

Ordenáveis.

---

## Rodapé

Paginação.

```text
Anterior

1

2

3

Próximo
```

---

# FORMULÁRIOS

Layout:

```text
2 colunas desktop

1 coluna mobile
```

---

Campos:

```css
Altura:
48px

Borda:
1px sólida

Border Radius:
12px
```

---

# BOTÕES

Primário

```css
Background:
#478C27

Texto:
Branco
```

---

Secundário

```css
Background:
#001731

Texto:
Branco
```

---

Perigo

```css
Background:
#DC2626
```

---

# MÓDULO IMÓVEIS

## Tela de Listagem

Topo:

```text
Pesquisar

Filtros

Novo Imóvel
```

---

Cards rápidos

```text
Disponíveis

Alugados

Reservados

Manutenção
```

---

Tabela

```text
Código

Nome

Tipo

Proprietário

Status

Valor Locação

Ações
```

---

# FICHA COMPLETA DO IMÓVEL

Layout:

---

Cabeçalho

```text
Foto Principal

Nome do Imóvel

Status

Código
```

---

Aba 1

```text
Dados Gerais
```

---

Aba 2

```text
Documentos
```

---

Aba 3

```text
Contratos
```

---

Aba 4

```text
Recebimentos
```

---

Aba 5

```text
Despesas
```

---

Aba 6

```text
Manutenções
```

---

Aba 7

```text
Vistorias
```

---

Aba 8

```text
Timeline
```

---

# MÓDULO LOCATÁRIOS

Tabela:

```text
Nome

CPF/CNPJ

Telefone

Email

Quantidade de Contratos

Status
```

---

# MÓDULO PROPRIETÁRIOS

Tabela:

```text
Nome

CPF/CNPJ

Telefone

Quantidade de Imóveis

Status
```

---

# MÓDULO CONTRATOS

Cards:

```text
Ativos

Vencendo

Encerrados
```

---

Tabela:

```text
Número

Imóvel

Locatário

Início

Fim

Valor

Status
```

---

# MÓDULO RECEBIMENTOS

Cards:

```text
Receita Prevista

Receita Recebida

Receita em Atraso
```

---

Tabela:

```text
Competência

Vencimento

Valor

Recebido

Status
```

---

# MÓDULO DESPESAS

Cards:

```text
A Vencer

Pagas

Vencidas
```

---

Tabela:

```text
Categoria

Imóvel

Responsável

Valor

Vencimento

Status
```

---

# MÓDULO MANUTENÇÕES

Tabela:

```text
Imóvel

Data

Serviço

Valor

Responsável
```

---

# MÓDULO VISTORIAS

Tabela:

```text
Imóvel

Tipo

Data

Responsável
```

---

# MÓDULO CALENDÁRIO

Visual:

```text
Google Agenda
```

Modos:

- Mês
- Semana
- Dia

---

Cores dos eventos

Recebimentos

```css
#16A34A
```

---

Contratos

```css
#2563EB
```

---

Despesas

```css
#DC2626
```

---

Documentos

```css
#F59E0B
```

---

# MÓDULO RELATÓRIOS

Layout em Cards.

Exemplo:

```text
Receitas

Despesas

Contratos

Inadimplência

Fluxo de Caixa

Ocupação

Manutenções

Vistorias
```

---

# MÓDULO AUDITORIA

Filtros:

```text
Usuário

Módulo

Data Inicial

Data Final
```

---

Tabela:

```text
Usuário

Data

Hora

Módulo

Ação

Descrição
```

---

# NOTIFICAÇÕES

Ícone:

🔔

---

Dropdown:

```text
Título

Descrição

Data

Marcar como lida
```

---

# RESPONSIVIDADE

Desktop

```css
≥ 1200px
```

Sidebar fixa.

---

Tablet

```css
768px a 1199px
```

Sidebar recolhível.

---

Mobile

```css
até 767px
```

Menu lateral tipo Drawer.

---

# GLASSMORPHISM

Aplicar em:

- Cards
- Modais
- Dashboard

Exemplo:

```css
background: rgba(255,255,255,.1);
backdrop-filter: blur(12px);
border: 1px solid rgba(255,255,255,.2);
```

---

# EXPERIÊNCIA DO USUÁRIO

Todas as ações deverão possuir:

- Loading
- Toast de sucesso
- Toast de erro
- Confirmação de ações críticas

Exemplo:

```text
Deseja realmente inativar este imóvel?
```

---

# PADRÃO DE ÍCONES

Bibliotecas:

- Font Awesome 6
- Flaticon UIcons

---

# LOGOTIPO

Marca própria.

Composta por:

- Símbolo
- Nome NexoMoveis

Formato horizontal.

Uso na Sidebar e Login.

---

# DIRETRIZ FINAL

O sistema deve possuir aparência semelhante a softwares modernos de gestão empresarial (ERP/CRM), priorizando:

- Rapidez
- Clareza visual
- Facilidade de navegação
- Operação eficiente em desktop e celular
- Interface limpa e profissional