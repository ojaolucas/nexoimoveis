# DATABASE.md
# NexoMoveis - Estrutura do Banco de Dados PostgreSQL (Atualizada Fase 2.5)
Versão: 1.5

---

## PADRÃO DE TABELAS

Todas as tabelas de negócio deverão possuir os seguintes campos para controle de estado e auditoria temporal:

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
status VARCHAR(20) NOT NULL -- 'ativo', 'inativo'
criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
```

---

## TABELA: usuarios
Controle de acessos do sistema.
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
nome VARCHAR(200) NOT NULL
cpf VARCHAR(14) UNIQUE NOT NULL
email VARCHAR(255) UNIQUE NOT NULL
senha_hash TEXT NOT NULL
perfil VARCHAR(30) NOT NULL CHECK (perfil IN ('administrador', 'operacional', 'consulta'))
ultimo_login TIMESTAMP
status VARCHAR(20) NOT NULL DEFAULT 'ativo'
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
```

---

## TABELA: auditoria
Registro de logs de auditoria de alterações do sistema.
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
usuario_id UUID REFERENCES usuarios(id)
modulo VARCHAR(100) NOT NULL
acao VARCHAR(100) NOT NULL
descricao TEXT
ip VARCHAR(45)
data_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
```

---

## TABELA: notificacoes
Fila de notificações automáticas.
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
titulo VARCHAR(255) NOT NULL
descricao TEXT NOT NULL
tipo VARCHAR(50) NOT NULL
referencia_id UUID
lida BOOLEAN NOT NULL DEFAULT FALSE
criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
```

---

## TABELA: proprietarios
Cadastro unificado de proprietários (Locadores) PF/PJ.
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
codigo VARCHAR(50) UNIQUE NOT NULL
tipo_pessoa VARCHAR(10) NOT NULL CHECK (tipo_pessoa IN ('PF', 'PJ'))
nome_razao_social VARCHAR(255) NOT NULL
nome_fantasia VARCHAR(255)
cpf_cnpj VARCHAR(20) UNIQUE NOT NULL
telefone VARCHAR(30) NOT NULL
email VARCHAR(255) NOT NULL
endereco TEXT -- Estrutura JSON ou Texto Plano do Endereço
observacoes TEXT
status VARCHAR(20) NOT NULL DEFAULT 'ativo'
criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
```

---

## TABELA: locatarios
Cadastro unificado de locatários (Inquilinos) PF/PJ.
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
codigo VARCHAR(50) UNIQUE NOT NULL
tipo_pessoa VARCHAR(10) NOT NULL CHECK (tipo_pessoa IN ('PF', 'PJ'))
nome_razao_social VARCHAR(255) NOT NULL
nome_fantasia VARCHAR(255)
cpf_cnpj VARCHAR(20) UNIQUE NOT NULL
rg_ie VARCHAR(30)
telefone VARCHAR(30) NOT NULL
email VARCHAR(255) NOT NULL
endereco TEXT
observacoes TEXT
status VARCHAR(20) NOT NULL DEFAULT 'ativo'
criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
```

---

## TABELA: imoveis
Cadastro de imóveis geridos.
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
codigo VARCHAR(50) UNIQUE NOT NULL
nome VARCHAR(255) NOT NULL
tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('Galpão', 'Casa', 'Apartamento', 'Sala Comercial', 'Loja', 'Terreno', 'Galeria Comercial', 'Prédio Comercial'))
proprietario_id UUID REFERENCES proprietarios(id) ON DELETE RESTRICT
endereco TEXT NOT NULL
area_total NUMERIC(12,2) NOT NULL
valor_locacao NUMERIC(12,2) NOT NULL
status VARCHAR(30) NOT NULL DEFAULT 'Disponível' CHECK (status IN ('Disponível', 'Alugado', 'Reservado', 'Manutenção', 'Inativo'))
observacoes TEXT
foto_principal TEXT
criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
```

---

## TABELA: contratos
Contratos de locação ativos e encerrados.
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
numero_contrato VARCHAR(50) UNIQUE NOT NULL
imovel_id UUID REFERENCES imoveis(id) ON DELETE RESTRICT
locatario_id UUID REFERENCES locatarios(id) ON DELETE RESTRICT
data_inicio DATE NOT NULL
data_fim DATE NOT NULL
valor_mensal NUMERIC(12,2) NOT NULL
dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31)
caucao NUMERIC(12,2)
garantia VARCHAR(50) NOT NULL
indice_reajuste VARCHAR(20) NOT NULL CHECK (indice_reajuste IN ('IPCA', 'IGPM', 'MANUAL'))
observacoes TEXT
arquivo_pdf TEXT
status VARCHAR(30) NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Encerrado', 'Cancelado'))
criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
```

---

## TABELA: recebimentos
Parcelas financeiras a receber vinculadas a contratos.
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
contrato_id UUID REFERENCES contratos(id) ON DELETE RESTRICT
competencia DATE NOT NULL
vencimento DATE NOT NULL
valor_previsto NUMERIC(12,2) NOT NULL
valor_recebido NUMERIC(12,2)
data_pagamento DATE
forma_pagamento VARCHAR(50) CHECK (forma_pagamento IN ('PIX', 'Transferência', 'Dinheiro', 'Boleto', 'Cartão', 'Outros'))
observacoes TEXT
status VARCHAR(30) NOT NULL DEFAULT 'A Vencer' CHECK (status IN ('A Vencer', 'Pago', 'Parcial', 'Vencido', 'Cancelado'))
criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
```

---

## TABELA: despesas
Despesas operacionais e financeiras de cada imóvel.
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
imovel_id UUID REFERENCES imoveis(id) ON DELETE RESTRICT
categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('IPTU', 'Água', 'Energia', 'Condomínio', 'Seguro', 'Internet', 'Limpeza', 'Manutenção', 'Taxa de Localização', 'Outras'))
responsavel VARCHAR(20) NOT NULL CHECK (responsavel IN ('Locador', 'Locatário'))
competencia DATE NOT NULL
vencimento DATE NOT NULL
valor NUMERIC(12,2) NOT NULL
data_pagamento DATE
observacoes TEXT
status VARCHAR(30) NOT NULL DEFAULT 'A Vencer' CHECK (status IN ('A Vencer', 'Pago', 'Vencido', 'Cancelado'))
recorrente BOOLEAN NOT NULL DEFAULT FALSE
criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
```

---

## RELACIONAMENTOS

```text
proprietarios (1) ───< (N) imoveis
imoveis (1) ───< (N) despesas
imoveis (1) ───< (N) contratos
locatarios (1) ───< (N) contratos
contratos (1) ───< (N) recebimentos
usuarios (1) ───< (N) auditoria
```