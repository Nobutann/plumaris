USE adocao_bd;

-- ============================================================================
-- TABELA DE LOGS PARA AUDITORIA DOS ANIMAIS
-- Armazena o histórico de eventos operacionais e alterações nos registros da
-- tabela Animal (mudanças de disponibilidade, transferências entre centros e
-- edições cadastrais).
-- ============================================================================
CREATE TABLE IF NOT EXISTS Log_Auditoria_Animal (
    idLog INT NOT NULL AUTO_INCREMENT,
    idAnimal INT NOT NULL,
    nomeAnimal VARCHAR(100) NOT NULL,
    tipoEvento VARCHAR(40) NOT NULL,
    disponibilidadeAnterior BOOLEAN NOT NULL,
    disponibilidadeNova BOOLEAN NOT NULL,
    idCentroAnterior INT NOT NULL,
    idCentroNovo INT NOT NULL,
    detalhes VARCHAR(500) NOT NULL,
    dataEvento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_log_auditoria_animal PRIMARY KEY (idLog),
    CONSTRAINT ck_log_tipo_evento CHECK (
        tipoEvento IN (
            'ADOCAO_INDISPONIVEL',
            'REATIVACAO_DISPONIVEL',
            'TRANSFERENCIA_CENTRO',
            'ATUALIZACAO_CADASTRO'
        )
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- TRIGGER 1: trg_animal_after_update_log (Atualização de tabela de logs)
-- Justificativa semântica:
--   Garante rastreabilidade automática do ciclo de vida dos animais acolhidos.
--   Sempre que um animal tem sua disponibilidade alterada (ex.: adoção
--   concluída ou retorno ao catálogo), é transferido entre unidades de centros
--   de adoção ou sofre atualização cadastral, um registro de auditoria com os
--   estados anterior (OLD) e novo (NEW) é gravado em Log_Auditoria_Animal.
-- ============================================================================
DROP TRIGGER IF EXISTS trg_animal_after_update_log;

DELIMITER $$

CREATE TRIGGER trg_animal_after_update_log
AFTER UPDATE ON Animal
FOR EACH ROW
BEGIN
    DECLARE v_tipo_evento VARCHAR(40);
    DECLARE v_detalhes VARCHAR(500);

    IF OLD.disponibilidade <> NEW.disponibilidade AND NEW.disponibilidade = 0 THEN
        SET v_tipo_evento = 'ADOCAO_INDISPONIVEL';
        SET v_detalhes = CONCAT(
            'Animal "', NEW.nome, '" passou de disponivel (1) para indisponivel/adotado (0) no centro ',
            NEW.idCentro, '.'
        );
    ELSEIF OLD.disponibilidade <> NEW.disponibilidade AND NEW.disponibilidade = 1 THEN
        SET v_tipo_evento = 'REATIVACAO_DISPONIVEL';
        SET v_detalhes = CONCAT(
            'Animal "', NEW.nome, '" voltou a ficar disponivel para adocao (1) no centro ',
            NEW.idCentro, '.'
        );
    ELSEIF OLD.idCentro <> NEW.idCentro THEN
        SET v_tipo_evento = 'TRANSFERENCIA_CENTRO';
        SET v_detalhes = CONCAT(
            'Animal "', NEW.nome, '" transferido do centro ',
            OLD.idCentro, ' para o centro ', NEW.idCentro, '.'
        );
    ELSE
        SET v_tipo_evento = 'ATUALIZACAO_CADASTRO';
        SET v_detalhes = CONCAT(
            'Dados cadastrais do animal "', NEW.nome, '" (especie: ', NEW.especie, ') foram atualizados.'
        );
    END IF;

    INSERT INTO Log_Auditoria_Animal (
        idAnimal,
        nomeAnimal,
        tipoEvento,
        disponibilidadeAnterior,
        disponibilidadeNova,
        idCentroAnterior,
        idCentroNovo,
        detalhes,
        dataEvento
    ) VALUES (
        NEW.idAnimal,
        NEW.nome,
        v_tipo_evento,
        OLD.disponibilidade,
        NEW.disponibilidade,
        OLD.idCentro,
        NEW.idCentro,
        v_detalhes,
        CURRENT_TIMESTAMP
    );
END$$

-- ============================================================================
-- TRIGGER 2: trg_interesse_before_insert_validar (Regra de negócio do domínio)
-- Justificativa semântica:
--   As restrições declarativas (FOREIGN KEY e CHECK) da tabela Interesse não
--   conseguem consultar a tabela Animal para verificar se o animal está ativo
--   para adoção. Este trigger impede que usuários registrem novas
--   manifestações de interesse em animais que já estão indisponíveis/adotados
--   (disponibilidade = 0) ou com data futura de interesse.
-- ============================================================================
DROP TRIGGER IF EXISTS trg_interesse_before_insert_validar$$

CREATE TRIGGER trg_interesse_before_insert_validar
BEFORE INSERT ON Interesse
FOR EACH ROW
BEGIN
    DECLARE v_disponibilidade BOOLEAN;

    SELECT disponibilidade
    INTO v_disponibilidade
    FROM Animal
    WHERE idAnimal = NEW.idAnimal;

    IF v_disponibilidade = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Nao e permitido registrar interesse em um animal indisponivel para adocao.';
    END IF;

    IF NEW.dataInteresse > CURRENT_TIMESTAMP THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A data de registro do interesse nao pode ser futura.';
    END IF;
END$$

DELIMITER ;

-- ============================================================================
-- DEMONSTRAÇÃO DOS TRIGGERS
-- ============================================================================

-- 1. Disparo de trg_animal_after_update_log via atualização de centro e disponibilidade
UPDATE Animal SET idCentro = 38 WHERE idAnimal = 1;
UPDATE Animal SET idCentro = 32 WHERE idAnimal = 1;

-- Consulta os registros gravados automaticamente na tabela de logs
SELECT
    idLog,
    idAnimal,
    nomeAnimal,
    tipoEvento,
    disponibilidadeAnterior,
    disponibilidadeNova,
    idCentroAnterior,
    idCentroNovo,
    detalhes,
    dataEvento
FROM Log_Auditoria_Animal
ORDER BY idLog DESC;

-- 2. Exemplo (comentado) que aciona o bloqueio do trigger trg_interesse_before_insert_validar
--    O animal 7 (Rex) possui disponibilidade = 0; descomente para testar o erro SQLSTATE 45000:
-- INSERT INTO Interesse (idConta, idAnimal) VALUES (1, 7);

