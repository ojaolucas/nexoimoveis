import os
import psycopg2

def load_env():
    env_vars = {}
    env_path = r"C:\Users\padra\Downloads\nexoimoveis\.env"
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    env_vars[k.strip()] = v.strip().strip('"').strip("'")
    return env_vars

def run():
    env = load_env()
    
    db_host = env.get('DB_HOST', 'localhost')
    db_port = env.get('DB_PORT', '5432')
    db_name = env.get('DB_NAME')
    db_user = env.get('DB_USER')
    db_pass = env.get('DB_PASSWORD')
    
    print(f"Connecting to database {db_name} on {db_host}:{db_port} as {db_user}...")
    
    try:
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            database=db_name,
            user=db_user,
            password=db_pass
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        sql = """
        -- Drop legacy tables if they exist
        DROP TABLE IF EXISTS vistorias_timeline CASCADE;
        DROP TABLE IF EXISTS vistorias_fotos CASCADE;
        DROP TABLE IF EXISTS vistorias_itens CASCADE;
        DROP TABLE IF EXISTS vistorias CASCADE;

        -- Create vistorias table
        CREATE TABLE IF NOT EXISTS vistorias (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            codigo VARCHAR(50) UNIQUE NOT NULL,
            imovel_id UUID NOT NULL REFERENCES imoveis(id) ON DELETE RESTRICT,
            contrato_id UUID REFERENCES contratos(id) ON DELETE SET NULL,
            tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('Entrada', 'Saída', 'Periódica', 'Extraordinária')),
            data_vistoria DATE NOT NULL,
            responsavel VARCHAR(255) NOT NULL,
            observacoes_gerais TEXT,
            status VARCHAR(30) NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Em Andamento', 'Concluída', 'Cancelada')),
            criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- Create vistorias_itens table
        CREATE TABLE IF NOT EXISTS vistorias_itens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            vistoria_id UUID NOT NULL REFERENCES vistorias(id) ON DELETE CASCADE,
            item_nome VARCHAR(100) NOT NULL CHECK (item_nome IN (
              'Estrutura', 'Cobertura', 'Piso', 'Paredes', 'Pintura', 'Portões', 'Portas', 
              'Janelas', 'Instalação Elétrica', 'Instalação Hidráulica', 'Banheiros', 
              'Área Externa', 'Limpeza Geral', 'Outros'
            )),
            condicao VARCHAR(50) NOT NULL DEFAULT 'Bom' CHECK (condicao IN (
              'Excelente', 'Bom', 'Regular', 'Ruim', 'Necessita Reparo'
            )),
            observacao TEXT,
            criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- Create vistorias_fotos table
        CREATE TABLE IF NOT EXISTS vistorias_fotos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            vistoria_id UUID NOT NULL REFERENCES vistorias(id) ON DELETE CASCADE,
            item_id UUID REFERENCES vistorias_itens(id) ON DELETE CASCADE,
            tipo_foto VARCHAR(50) NOT NULL CHECK (tipo_foto IN ('Principal', 'Geral', 'Item')),
            caminho_arquivo TEXT NOT NULL,
            criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- Create vistorias_timeline table
        CREATE TABLE IF NOT EXISTS vistorias_timeline (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            vistoria_id UUID NOT NULL REFERENCES vistorias(id) ON DELETE CASCADE,
            usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
            acao VARCHAR(100) NOT NULL,
            descricao TEXT NOT NULL,
            data_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_vistorias_imovel ON vistorias(imovel_id);
        CREATE INDEX IF NOT EXISTS idx_vistorias_contrato ON vistorias(contrato_id);
        CREATE INDEX IF NOT EXISTS idx_vistorias_tipo ON vistorias(tipo);
        CREATE INDEX IF NOT EXISTS idx_vistorias_status ON vistorias(status);
        CREATE INDEX IF NOT EXISTS idx_vistorias_data ON vistorias(data_vistoria);
        CREATE INDEX IF NOT EXISTS idx_vistorias_itens_vist ON vistorias_itens(vistoria_id);
        CREATE INDEX IF NOT EXISTS idx_vistorias_fotos_vist ON vistorias_fotos(vistoria_id);
        CREATE INDEX IF NOT EXISTS idx_vistorias_timeline_vist ON vistorias_timeline(vistoria_id);
        """
        
        print("Applying migration for Phase 11: Vistorias...")
        cursor.execute(sql)
        print("Migrations applied successfully!")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error executing migration: {e}")

if __name__ == '__main__':
    run()
