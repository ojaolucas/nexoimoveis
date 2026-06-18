-- NexoMoveis - Funções Auxiliares do Banco de Dados
-- Versão 1.0

-- Função exemplo: Validar se uma data está dentro do intervalo
CREATE OR REPLACE FUNCTION is_date_between(
    check_date DATE,
    start_date DATE,
    end_date DATE
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN check_date >= start_date AND check_date <= end_date;
END;
$$ LANGUAGE plpgsql;
