USE adocao_bd;

-- Otimiza a busca de animais disponíveis por centro. É utilizado pela
-- consulta anti join e pela visão operacional dos centros.
CREATE INDEX idx_animal_centro_disponibilidade
    ON Animal (idCentro, disponibilidade);

-- Otimiza filtros por situação e espécie, mantendo a data de nascimento
-- disponível no índice para consultas etárias e cronológicas.
CREATE INDEX idx_animal_disponibilidade_especie_nascimento
    ON Animal (disponibilidade, especie, dataNascimento);
