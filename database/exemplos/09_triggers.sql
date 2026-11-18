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