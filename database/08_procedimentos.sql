USE adocao_bd;

-- ============================================================================
-- PROCEDIMENTO 1: sp_concluir_adocao_animal (Atualização de dados)
-- Justificativa semântica:
--   Realiza a baixa operacional de um animal quando sua adoção é concretizada
--   por um usuário cadastrado. Valida a existência do adotante e a
--   disponibilidade do animal, garante o registro do vínculo na tabela
--   Interesse e atualiza a disponibilidade (para 0) e o histórico na descrição
--   do animal dentro de uma única transação.
-- ============================================================================
DROP PROCEDURE IF EXISTS sp_concluir_adocao_animal;

DELIMITER $$

CREATE PROCEDURE sp_concluir_adocao_animal(
    IN p_id_animal INT,
    IN p_id_usuario INT
)
BEGIN
    DECLARE v_usuario_existe INT DEFAULT 0;
    DECLARE v_nome_usuario VARCHAR(120);
    DECLARE v_animal_existe INT DEFAULT 0;
    DECLARE v_disponibilidade BOOLEAN;

    SELECT COUNT(*), MAX(nome)
    INTO v_usuario_existe, v_nome_usuario
    FROM Usuario
    WHERE idConta = p_id_usuario;

    IF v_usuario_existe = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Usuario adotante nao encontrado.';
    END IF;

    SELECT COUNT(*), MAX(disponibilidade)
    INTO v_animal_existe, v_disponibilidade
    FROM Animal
    WHERE idAnimal = p_id_animal;

    IF v_animal_existe = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Animal nao encontrado.';
    END IF;

    IF v_disponibilidade = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Animal ja consta como indisponivel para adocao.';
    END IF;

    START TRANSACTION;

    -- Garante que o interesse do adotante pelo animal esteja registrado
    INSERT INTO Interesse (idConta, idAnimal, dataInteresse)
    VALUES (p_id_usuario, p_id_animal, CURRENT_TIMESTAMP)
    ON DUPLICATE KEY UPDATE dataInteresse = CURRENT_TIMESTAMP;

    -- Atualiza a situação do animal para indisponível (adotado) e anota na descrição
    UPDATE Animal
    SET disponibilidade = 0,
        descricao = CONCAT(
            COALESCE(descricao, ''),
            ' [Adocao concluida para ',
            v_nome_usuario,
            ' (ID ',
            p_id_usuario,
            ') em ',
            DATE_FORMAT(CURDATE(), '%Y-%m-%d'),
            ']'
        )
    WHERE idAnimal = p_id_animal;

    COMMIT;

    SELECT
        a.idAnimal,
        a.nome AS animalNome,
        a.especie,
        a.disponibilidade,
        a.idCentro,
        a.descricao
    FROM Animal a
    WHERE a.idAnimal = p_id_animal;
END$$

-- ============================================================================
-- PROCEDIMENTO 2: sp_redistribuir_animais_rede (Uso indispensável de CURSOR)
-- Justificativa semântica e necessidade real do CURSOR:
--   Quando um centro de adoção precisa ser desocupado temporariamente (para
--   reforma ou contingência), seus animais disponíveis precisam ser
--   redistribuídos entre as demais unidades vinculadas à mesma matriz
--   (tabela Vinculado_A), respeitando um limite máximo de animais disponíveis
--   por unidade destino (p_limite_por_unidade) e escolhendo sempre a unidade
--   com menor ocupação no momento de cada transferência.
--
--   Por que NÃO pode ser realizado por um único comando UPDATE?
--   1. Em um UPDATE baseado em conjunto (set-based), a subconsulta de menor
--      ocupação avaliaria o mesmo estado inicial para todas as linhas de uma
--      só vez, enviando todos os animais para a mesma unidade e violando o
--      limite de capacidade (p_limite_por_unidade).
--   2. Além disso, o MySQL proíbe em um UPDATE consultar a própria tabela
--      Animal na cláusula SET/WHERE para recalcular a contagem acumulada a
--      cada linha modificada (erro 1093 - Can't specify target table for
--      update in FROM clause).
--   Com o CURSOR, cada iteração transfere 1 animal e altera imediatamente a
--   ocupação da unidade destino antes da decisão para o próximo animal.
-- ============================================================================
DROP PROCEDURE IF EXISTS sp_redistribuir_animais_rede$$

CREATE PROCEDURE sp_redistribuir_animais_rede(
    IN p_id_centro_origem INT,
    IN p_limite_por_unidade INT
)
BEGIN
    DECLARE v_centro_existe INT DEFAULT 0;
    DECLARE v_id_matriz INT DEFAULT NULL;
    DECLARE v_id_animal INT;
    DECLARE v_id_centro_destino INT DEFAULT NULL;
    DECLARE v_fim_cursor BOOLEAN DEFAULT FALSE;
    DECLARE v_total_transferidos INT DEFAULT 0;
    DECLARE v_restantes_origem INT DEFAULT 0;

    DECLARE cur_animais CURSOR FOR
        SELECT idAnimal
        FROM Animal
        WHERE idCentro = p_id_centro_origem
          AND disponibilidade = 1
        ORDER BY
            CASE WHEN dataNascimento IS NULL THEN 1 ELSE 0 END,
            dataNascimento ASC,
            idAnimal ASC;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_fim_cursor = TRUE;

    IF p_limite_por_unidade IS NULL OR p_limite_por_unidade <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'O limite por unidade deve ser maior que zero.';
    END IF;

    SELECT COUNT(*)
    INTO v_centro_existe
    FROM Centro_Adocao
    WHERE idConta = p_id_centro_origem;

    IF v_centro_existe = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Centro de adocao de origem nao encontrado.';
    END IF;

    -- Identifica a matriz da rede à qual o centro de origem pertence
    SELECT COALESCE(
        (SELECT idCentroPrincipal FROM Vinculado_A WHERE idCentroUnidade = p_id_centro_origem LIMIT 1),
        (SELECT idCentroPrincipal FROM Vinculado_A WHERE idCentroPrincipal = p_id_centro_origem LIMIT 1)
    ) INTO v_id_matriz;

    IF v_id_matriz IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'O centro informado nao possui unidades vinculadas na rede.';
    END IF;

    START TRANSACTION;

    OPEN cur_animais;

    loop_redistribuicao: LOOP
        SET v_fim_cursor = FALSE;
        FETCH cur_animais INTO v_id_animal;

        IF v_fim_cursor THEN
            LEAVE loop_redistribuicao;
        END IF;

        SET v_id_centro_destino = NULL;

        -- Busca a unidade da mesma rede (exceto a de origem) com a menor
        -- quantidade ATUAL de animais disponíveis e que ainda esteja abaixo
        -- da capacidade máxima (p_limite_por_unidade).
        SELECT c.idConta
        INTO v_id_centro_destino
        FROM Centro_Adocao c
        JOIN Vinculado_A v ON v.idCentroUnidade = c.idConta
        LEFT JOIN Animal a
            ON a.idCentro = c.idConta
           AND a.disponibilidade = 1
        WHERE v.idCentroPrincipal = v_id_matriz
          AND c.idConta <> p_id_centro_origem
        GROUP BY c.idConta
        HAVING COUNT(a.idAnimal) < p_limite_por_unidade
        ORDER BY COUNT(a.idAnimal) ASC, c.idConta ASC
        LIMIT 1;

        -- Se todas as unidades da rede atingiram o limite, interrompe a alocação
        IF v_id_centro_destino IS NULL THEN
            LEAVE loop_redistribuicao;
        END IF;

        -- Transfere o animal atual, alterando o estado para a próxima iteração
        UPDATE Animal
        SET idCentro = v_id_centro_destino
        WHERE idAnimal = v_id_animal;

        SET v_total_transferidos = v_total_transferidos + 1;
    END LOOP loop_redistribuicao;

    CLOSE cur_animais;

    COMMIT;

    SELECT COUNT(*)
    INTO v_restantes_origem
    FROM Animal
    WHERE idCentro = p_id_centro_origem
      AND disponibilidade = 1;

    SELECT
        p_id_centro_origem AS idCentroOrigem,
        v_id_matriz AS idCentroMatriz,
        p_limite_por_unidade AS limitePorUnidade,
        v_total_transferidos AS animaisTransferidos,
        v_restantes_origem AS animaisRestantesOrigem;
END$$

DELIMITER ;

-- ============================================================================
-- DEMONSTRAÇÃO DOS PROCEDIMENTOS
-- ============================================================================

-- 1. Demonstração de sp_redistribuir_animais_rede:
--    Redistribui os animais disponíveis da Unidade 01 (idConta = 32) para as
--    unidades vinculadas com menor ocupação (ex.: unidades sem animais
--    disponíveis como 38, 45, 52, 59), respeitando o limite de 1 animal
--    disponível por unidade, e em seguida restaura o centro original do animal.
CALL sp_redistribuir_animais_rede(32, 1);

-- Restaura o animal 1 (Thor) para a Unidade 01 (idConta = 32) após o teste
UPDATE Animal SET idCentro = 32 WHERE idAnimal = 1;

-- 2. Demonstração de sp_concluir_adocao_animal:
--    Conclui a adoção do animal 1 (Thor) pelo usuário 1 (Ana Silva) e, em
--    seguida, restaura o estado original para manter a carga de referência.
CALL sp_concluir_adocao_animal(1, 1);

-- Restaura o estado original do animal 1 após o teste
UPDATE Animal
SET disponibilidade = 1,
    descricao = 'Animal acolhido; entre em contato com o centro para conhecer seu perfil.'
WHERE idAnimal = 1;

