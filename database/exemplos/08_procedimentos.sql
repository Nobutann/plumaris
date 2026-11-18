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