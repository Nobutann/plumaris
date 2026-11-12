USE adocao_bd;

-- ============================================================================
-- FUNÇÃO 1: fn_classificar_prioridade_adocao
-- Justificativa semântica:
--   Classifica o nível de prioridade de divulgação de um animal nos centros de
--   adoção combinando sua disponibilidade, idade, porte e total de interesses
--   registrados. Animais idosos, de porte grande ou sem manifestações de
--   interesse possuem maior dificuldade de colocação e demandam destaque nas
--   campanhas de adoção. Utiliza estrutura condicional (IF / ELSEIF / ELSE).
-- ============================================================================
DROP FUNCTION IF EXISTS fn_classificar_prioridade_adocao;

DELIMITER $$

CREATE FUNCTION fn_classificar_prioridade_adocao(p_id_animal INT)
RETURNS VARCHAR(30)
READS SQL DATA
BEGIN
    DECLARE v_existe INT DEFAULT 0;
    DECLARE v_disponibilidade BOOLEAN;
    DECLARE v_data_nascimento DATE;
    DECLARE v_porte VARCHAR(20);
    DECLARE v_idade_anos INT DEFAULT NULL;
    DECLARE v_total_interesses INT DEFAULT 0;
    DECLARE v_classificacao VARCHAR(30);

    SELECT
        COUNT(*),
        MAX(disponibilidade),
        MAX(dataNascimento),
        MAX(porte)
    INTO
        v_existe,
        v_disponibilidade,
        v_data_nascimento,
        v_porte
    FROM Animal
    WHERE idAnimal = p_id_animal;

    IF v_existe = 0 THEN
        SET v_classificacao = 'Animal inexistente';
    ELSEIF v_disponibilidade = 0 THEN
        SET v_classificacao = 'Indisponivel';
    ELSE
        IF v_data_nascimento IS NOT NULL AND v_data_nascimento <= CURDATE() THEN
            SET v_idade_anos = TIMESTAMPDIFF(YEAR, v_data_nascimento, CURDATE());
        END IF;

        SELECT COUNT(*)
        INTO v_total_interesses
        FROM Interesse
        WHERE idAnimal = p_id_animal;

        IF v_idade_anos IS NOT NULL AND v_idade_anos >= 5 AND v_total_interesses = 0 THEN
            SET v_classificacao = 'Prioridade Critica';
        ELSEIF v_total_interesses = 0
                OR (v_idade_anos IS NOT NULL AND v_idade_anos >= 3 AND v_porte = 'Grande') THEN
            SET v_classificacao = 'Prioridade Alta';
        ELSEIF v_total_interesses <= 2 THEN
            SET v_classificacao = 'Prioridade Media';
        ELSE
            SET v_classificacao = 'Alta Procura';
        END IF;
    END IF;

    RETURN v_classificacao;
END$$

-- ============================================================================
-- FUNÇÃO 2: fn_pontuacao_compatibilidade
-- Justificativa semântica:
--   Calcula um índice de compatibilidade (0 a 100 pontos) entre a preferência
--   cadastrada por um usuário e um animal disponível. Permite ranquear animais
--   por grau de aderência ao perfil do adotante (espécie, porte, faixa etária,
--   raça, sexo e cor), superando a limitação de filtros booleanos rígidos.
-- ============================================================================
DROP FUNCTION IF EXISTS fn_pontuacao_compatibilidade$$

CREATE FUNCTION fn_pontuacao_compatibilidade(p_id_usuario INT, p_id_animal INT)
RETURNS INT
READS SQL DATA
BEGIN
    DECLARE v_tem_pref INT DEFAULT 0;
    DECLARE v_tem_animal INT DEFAULT 0;

    DECLARE v_pref_especie VARCHAR(30);
    DECLARE v_pref_porte VARCHAR(20);
    DECLARE v_pref_idade_min INT;
    DECLARE v_pref_idade_max INT;
    DECLARE v_pref_sexo VARCHAR(20);
    DECLARE v_pref_cor VARCHAR(50);
    DECLARE v_pref_raca INT;

    DECLARE v_animal_especie VARCHAR(30);
    DECLARE v_animal_data_nasc DATE;
    DECLARE v_animal_sexo VARCHAR(20);
    DECLARE v_animal_porte VARCHAR(20);
    DECLARE v_animal_cor VARCHAR(50);
    DECLARE v_animal_disp BOOLEAN;
    DECLARE v_animal_raca INT;
    DECLARE v_idade_anos INT DEFAULT NULL;

    DECLARE v_pontuacao INT DEFAULT 0;

    SELECT
        COUNT(*),
        MAX(especieDesejada),
        MAX(porteDesejado),
        MAX(idadeMinima),
        MAX(idadeMaxima),
        MAX(sexoDesejado),
        MAX(corDesejada),
        MAX(idRaca)
    INTO
        v_tem_pref,
        v_pref_especie,
        v_pref_porte,
        v_pref_idade_min,
        v_pref_idade_max,
        v_pref_sexo,
        v_pref_cor,
        v_pref_raca
    FROM Preferencia
    WHERE idConta = p_id_usuario;

    SELECT
        COUNT(*),
        MAX(especie),
        MAX(dataNascimento),
        MAX(sexo),
        MAX(porte),
        MAX(cor),
        MAX(disponibilidade),
        MAX(idRaca)
    INTO
        v_tem_animal,
        v_animal_especie,
        v_animal_data_nasc,
        v_animal_sexo,
        v_animal_porte,
        v_animal_cor,
        v_animal_disp,
        v_animal_raca
    FROM Animal
    WHERE idAnimal = p_id_animal;

    -- Se o usuário não possui preferência, o animal não existe ou está indisponível,
    -- ou a espécie é incompatível (critério eliminatório), retorna 0.
    IF v_tem_pref = 0 OR v_tem_animal = 0 OR v_animal_disp = 0 THEN
        RETURN 0;
    END IF;

    IF v_pref_especie IS NOT NULL AND v_pref_especie <> v_animal_especie THEN
        RETURN 0;
    END IF;

    -- Espécie compatível: +25 pontos
    SET v_pontuacao = v_pontuacao + 25;

    -- Porte compatível ou indiferente: +20 pontos
    IF v_pref_porte IS NULL OR v_pref_porte = v_animal_porte THEN
        SET v_pontuacao = v_pontuacao + 20;
    END IF;

    -- Faixa etária compatível ou indiferente: +20 pontos
    IF v_animal_data_nasc IS NOT NULL AND v_animal_data_nasc <= CURDATE() THEN
        SET v_idade_anos = TIMESTAMPDIFF(YEAR, v_animal_data_nasc, CURDATE());
    END IF;

    IF (v_pref_idade_min IS NULL AND v_pref_idade_max IS NULL)
       OR (v_idade_anos IS NOT NULL
           AND (v_pref_idade_min IS NULL OR v_idade_anos >= v_pref_idade_min)
           AND (v_pref_idade_max IS NULL OR v_idade_anos <= v_pref_idade_max)) THEN
        SET v_pontuacao = v_pontuacao + 20;
    END IF;

    -- Raça compatível ou indiferente: +15 pontos
    IF v_pref_raca IS NULL OR v_pref_raca = v_animal_raca THEN
        SET v_pontuacao = v_pontuacao + 15;
    END IF;

    -- Sexo compatível ou indiferente: +10 pontos
    IF v_pref_sexo IS NULL OR v_pref_sexo = v_animal_sexo THEN
        SET v_pontuacao = v_pontuacao + 10;
    END IF;

    -- Cor compatível ou indiferente: +10 pontos
    IF v_pref_cor IS NULL OR v_pref_cor = v_animal_cor THEN
        SET v_pontuacao = v_pontuacao + 10;
    END IF;

    RETURN v_pontuacao;
END$$

DELIMITER ;

-- ============================================================================
-- CONSULTAS DE DEMONSTRAÇÃO DAS FUNÇÕES
-- ============================================================================

-- 1. Lista de animais com sua classificação de prioridade de adoção
SELECT
    a.idAnimal,
    a.nome AS animalNome,
    a.especie,
    a.porte,
    a.dataNascimento,
    a.disponibilidade,
    COUNT(i.idConta) AS totalInteresses,
    fn_classificar_prioridade_adocao(a.idAnimal) AS prioridadeAdocao
FROM Animal a
LEFT JOIN Interesse i ON i.idAnimal = a.idAnimal
GROUP BY
    a.idAnimal,
    a.nome,
    a.especie,
    a.porte,
    a.dataNascimento,
    a.disponibilidade
ORDER BY a.idAnimal;

-- 2. Ranking de animais mais compatíveis para o usuário 1
SET @id_usuario_teste = 1;

SELECT
    a.idAnimal,
    a.nome AS animalNome,
    a.especie,
    a.porte,
    a.sexo,
    a.cor,
    r.nome AS racaNome,
    fn_pontuacao_compatibilidade(@id_usuario_teste, a.idAnimal) AS pontuacaoCompatibilidade,
    fn_classificar_prioridade_adocao(a.idAnimal) AS prioridadeAdocao
FROM Animal a
LEFT JOIN Raca r ON r.idRaca = a.idRaca
WHERE a.disponibilidade = 1
ORDER BY pontuacaoCompatibilidade DESC, a.idAnimal ASC;

