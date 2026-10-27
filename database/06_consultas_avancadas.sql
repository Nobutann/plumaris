USE adocao_bd;

-- CONSULTA 1 - ANTI JOIN
-- Centros sem nenhum animal disponível para adoção.
SELECT
    c.idConta AS idCentro,
    c.nome AS centroNome,
    c.cidade,
    c.estado
FROM Centro_Adocao c
LEFT JOIN Animal a
    ON a.idCentro = c.idConta
    AND a.disponibilidade = 1
WHERE a.idAnimal IS NULL
ORDER BY c.nome, c.idConta;

-- CONSULTA 2 - FULL OUTER JOIN EMULADO PARA MYSQL
-- O primeiro bloco preserva todas as raças. O segundo acrescenta somente os
-- animais sem raça, completando os registros exclusivos do outro lado.
SELECT
    r.idRaca,
    r.nome AS racaNome,
    r.especie AS racaEspecie,
    a.idAnimal,
    a.nome AS animalNome,
    a.especie AS animalEspecie,
    CASE
        WHEN a.idAnimal IS NULL THEN 'Raca sem animal'
        ELSE 'Raca com animal'
    END AS situacaoVinculo
FROM Raca r
LEFT JOIN Animal a ON a.idRaca = r.idRaca

UNION ALL

SELECT
    r.idRaca,
    r.nome AS racaNome,
    r.especie AS racaEspecie,
    a.idAnimal,
    a.nome AS animalNome,
    a.especie AS animalEspecie,
    'Animal sem raca' AS situacaoVinculo
FROM Animal a
LEFT JOIN Raca r ON r.idRaca = a.idRaca
WHERE r.idRaca IS NULL
ORDER BY idRaca, idAnimal;

-- CONSULTA 3 - SUBCONSULTA CORRELACIONADA COM NOT EXISTS
-- Usuários para os quais não existe animal disponível compatível com todos os
-- critérios preenchidos em sua preferência.
SELECT
    u.idConta AS idUsuario,
    u.nome AS usuarioNome,
    c.email,
    p.especieDesejada,
    p.porteDesejado,
    p.idadeMinima,
    p.idadeMaxima,
    p.sexoDesejado,
    p.corDesejada,
    p.idRaca,
    r.nome AS racaDesejadaNome
FROM Usuario u
JOIN Conta c ON c.idConta = u.idConta
JOIN Preferencia p ON p.idConta = u.idConta
LEFT JOIN Raca r ON r.idRaca = p.idRaca
WHERE NOT EXISTS (
    SELECT 1
    FROM Animal a
    WHERE a.disponibilidade = 1
        AND (p.especieDesejada IS NULL OR a.especie = p.especieDesejada)
        AND (p.porteDesejado IS NULL OR a.porte = p.porteDesejado)
        AND (p.sexoDesejado IS NULL OR a.sexo = p.sexoDesejado)
        AND (p.corDesejada IS NULL OR a.cor = p.corDesejada)
        AND (p.idRaca IS NULL OR a.idRaca = p.idRaca)
        AND (p.idadeMinima IS NULL OR (
            a.dataNascimento IS NOT NULL
            AND a.dataNascimento <= CURDATE()
            AND TIMESTAMPDIFF(YEAR, a.dataNascimento, CURDATE()) >= p.idadeMinima
        ))
        AND (p.idadeMaxima IS NULL OR (
            a.dataNascimento IS NOT NULL
            AND a.dataNascimento <= CURDATE()
            AND TIMESTAMPDIFF(YEAR, a.dataNascimento, CURDATE()) <= p.idadeMaxima
        ))
)
ORDER BY u.nome, u.idConta;

-- CONSULTA 4 - SUBCONSULTA CORRELACIONADA COM MÉDIA
-- Animais disponíveis mais idosos que a média dos disponíveis da mesma espécie.
SELECT
    a.idAnimal,
    a.nome AS animalNome,
    a.especie,
    TIMESTAMPDIFF(YEAR, a.dataNascimento, CURDATE()) AS idadeAnos,
    ROUND((
        SELECT AVG(TIMESTAMPDIFF(DAY, a2.dataNascimento, CURDATE())) / 365.2425
        FROM Animal a2
        WHERE a2.disponibilidade = 1
            AND a2.especie = a.especie
            AND a2.dataNascimento IS NOT NULL
            AND a2.dataNascimento <= CURDATE()
    ), 1) AS mediaIdadeEspecie,
    c.nome AS centroNome
FROM Animal a
JOIN Centro_Adocao c ON c.idConta = a.idCentro
WHERE a.disponibilidade = 1
    AND a.dataNascimento IS NOT NULL
    AND a.dataNascimento <= CURDATE()
    AND TIMESTAMPDIFF(DAY, a.dataNascimento, CURDATE()) > (
        SELECT AVG(TIMESTAMPDIFF(DAY, a2.dataNascimento, CURDATE()))
        FROM Animal a2
        WHERE a2.disponibilidade = 1
            AND a2.especie = a.especie
            AND a2.dataNascimento IS NOT NULL
            AND a2.dataNascimento <= CURDATE()
    )
ORDER BY a.especie, a.dataNascimento, a.idAnimal;

-- CONSULTAS DE DEMONSTRAÇÃO DAS VISÕES
SELECT *
FROM vw_painel_operacional_centros
ORDER BY centroNome, idCentro;

SELECT *
FROM vw_oferta_demanda_por_raca
ORDER BY especie, racaNome, idRaca;
