# CLAUDE_INSTRUCTIONS.md
# NexoMoveis - Diretrizes Obrigatórias de Desenvolvimento
Versão: 1.0

---

# OBJETIVO

Você está desenvolvendo o sistema NexoMoveis.

Antes de iniciar qualquer implementação, leia obrigatoriamente todos os documentos da pasta:

```text
/docs
```

Documentos obrigatórios:

```text
SRS.md
DATABASE.md
API.md
DESIGN.md
ROADMAP.md
```

Nenhuma funcionalidade deve ser criada sem estar documentada.

---

# TECNOLOGIAS OBRIGATÓRIAS

## Backend

Utilizar exclusivamente:

```text
Node.js >= 18
Express
PostgreSQL
Supabase
node-postgres (pg)
express-session
bcryptjs
multer
uuid
dotenv
cors
```

---

## Frontend

Utilizar exclusivamente:

```text
HTML5
CSS3
JavaScript ES6+
```

---

## Gráficos

Utilizar:

```text
Chart.js
```

---

## Ícones

Utilizar:

```text
Font Awesome 6
Flaticon UIcons
```

---

# TECNOLOGIAS PROIBIDAS

Não utilizar:

```text
React
Next.js
Vue
Angular
Nuxt
TypeScript
Prisma
Sequelize
TypeORM
MongoDB
Firebase
TailwindCSS
Bootstrap
jQuery
```

---

# BANCO DE DADOS

Banco oficial:

```text
PostgreSQL
```

Hospedagem:

```text
Supabase
```

---

# ACESSO AO BANCO

Utilizar:

```javascript
const { Pool } = require('pg');
```

Não utilizar ORM.

Todas as consultas deverão utilizar SQL puro.

Exemplo:

```javascript
const result = await pool.query(
  'SELECT * FROM imoveis WHERE id = $1',
  [id]
);
```

---

# ARQUITETURA OBRIGATÓRIA

Padrão:

```text
MVC
```

Estrutura:

```text
/src

/config
/controllers
/middlewares
/models
/routes
/services
/utils
/jobs

/public
  /css
  /js
  /img

/views

/uploads

docs
```

---

# ORGANIZAÇÃO DE CÓDIGO

Cada módulo deve possuir:

```text
Controller
Service
Route
```

Exemplo:

```text
imoveis.controller.js
imoveis.service.js
imoveis.routes.js
```

---

# AUTENTICAÇÃO

Utilizar:

```text
express-session
```

Login por:

```text
CPF
ou
Email
```

Mesmo campo.

---

# SENHAS

Obrigatório:

```text
bcryptjs
```

Nunca armazenar senha em texto puro.

Exemplo:

```javascript
bcrypt.hash()
bcrypt.compare()
```

---

# CONTROLE DE ACESSO

Perfis:

```text
administrador
operacional
consulta
```

---

## Administrador

Acesso total.

---

## Operacional

Pode:

```text
Cadastrar
Editar
```

Não pode:

```text
Inativar
Gerenciar usuários
```

---

## Consulta

Somente leitura.

---

# AUDITORIA

Toda ação relevante deve gerar log.

Exemplos:

```text
Login
Logout

Cadastro
Alteração

Inativação

Pagamento

Renovação de contrato
```

Registrar:

```text
Usuário
Data
Hora
Ação
Módulo
Descrição
```

---

# REGRA DE EXCLUSÃO

NUNCA excluir registros fisicamente.

Utilizar:

```text
status = ativo
status = inativo
```

---

# UPLOADS

Utilizar:

```text
multer
```

Armazenamento:

```text
Supabase Storage
```

---

## Limites

PDF

```text
20 MB
```

Imagem

```text
10 MB
```

---

# PADRÃO VISUAL

Seguir rigorosamente:

```text
DESIGN.md
```

---

# PALETA

```css
#478C27
#001731
#F9F9F9
```

---

# TEMAS

Implementar:

```text
Modo Claro
Modo Escuro
```

Persistir preferência do usuário.

---

# RESPONSIVIDADE

Obrigatória.

Suporte:

```text
Desktop
Tablet
Celular
```

---

# DASHBOARD

Implementar:

```text
Cards
Gráficos
Alertas
Notificações
```

Utilizar Chart.js.

---

# TABELAS

Todas as listagens devem possuir:

```text
Pesquisa
Filtros
Paginação
Exportação
```

---

# API

Seguir rigorosamente:

```text
API.md
```

---

# PADRÃO DE RESPOSTA

Sucesso:

```json
{
  "success": true,
  "message": "",
  "data": {}
}
```

Erro:

```json
{
  "success": false,
  "message": ""
}
```

---

# LOGS DE ERRO

Criar sistema centralizado.

Registrar:

```text
Data
Hora
Usuário
Módulo
Erro
Stack
```

---

# JOBS AUTOMÁTICOS

Criar rotina diária para:

```text
Gerar notificações

Contratos vencendo

IPTU vencendo

IPTU vencido

Seguro vencendo

Seguro vencido

Alvará vencendo

Alvará vencido

Despesas vencidas
```

Executar via:

```text
node-cron
```

---

# RECEBIMENTOS

Ao criar contrato:

```text
Gerar recebimentos automaticamente
```

---

# DESPESAS RECORRENTES

Gerar automaticamente.

Exemplo:

```text
Energia

Todo mês

Dia 15
```

---

# CONTRATOS

Ao renovar:

```text
Encerrar contrato anterior

Criar novo contrato

Gerar recebimentos
```

Manter histórico.

---

# QUALIDADE DE CÓDIGO

Todo código deve:

```text
Ser legível

Ser modular

Ser reutilizável

Possuir tratamento de erros

Possuir validações
```

---

# VALIDAÇÕES OBRIGATÓRIAS

CPF

CNPJ

Email

Campos obrigatórios

Datas

Valores monetários

Uploads

Permissões

---

# PERFORMANCE

O sistema será utilizado inicialmente entre:

```text
20 e 100 imóveis
```

Mas deve ser preparado para crescimento futuro.

---

# SEGURANÇA

Implementar:

```text
Session Security

Password Hash

SQL Parameterized Queries

Upload Validation

Permission Validation
```

Nunca concatenar SQL.

Exemplo proibido:

```javascript
SELECT * FROM usuarios WHERE id = '${id}'
```

Exemplo correto:

```javascript
SELECT * FROM usuarios WHERE id = $1
```

---

# DIRETRIZ MAIS IMPORTANTE

Não inventar:

- Tabelas
- Campos
- APIs
- Funcionalidades
- Regras de negócio

Tudo deve seguir rigorosamente:

```text
SRS.md
DATABASE.md
API.md
DESIGN.md
ROADMAP.md
```

Caso exista conflito entre documentos, a prioridade será:

```text
1. SRS.md
2. DATABASE.md
3. API.md
4. DESIGN.md
5. ROADMAP.md
```

---

# RESULTADO ESPERADO

Desenvolver um sistema web corporativo profissional, moderno, responsivo e escalável para gestão de imóveis e locações, denominado NexoMoveis, seguindo integralmente a documentação fornecida.