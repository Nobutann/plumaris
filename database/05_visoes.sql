USE adocao_bd;

-- Visão 1: painel gerencial de cada centro e de sua relação com a matriz.
-- Os LEFT JOINs preservam centros sem animais e animais sem interesses.
DROP VIEW IF EXISTS vw_painel_operacional_centros;

CREATE VIEW vw_painel_operacional_centros AS
SELECT
    c.idConta AS idCentro,
    c.nome AS centroNome,
    c.cidade,
    c.estado,
    cp.idConta AS idCentroPrincipal,
    cp.nome AS centroPrincipalNome,
    COUNT(DISTINCT a.idAnimal) AS totalAnimais,
    COUNT(DISTINCT CASE WHEN a.disponibilidade = 1 THEN a.idAnimal END) AS animaisDisponiveis,
    COUNT(DISTINCT CASE WHEN a.disponibilidade = 0 THEN a.idAnimal END) AS animaisIndisponiveis,
    COUNT(DISTINCT i.idConta, i.idAnimal) AS totalInteresses,
    MAX(i.dataInteresse) AS ultimoInteresse
FROM Centro_Adocao c
LEFT JOIN Vinculado_A v ON v.idCentroUnidade = c.idConta
LEFT JOIN Centro_Adocao cp ON cp.idConta = v.idCentroPrincipal
LEFT JOIN Animal a ON a.idCentro = c.idConta
LEFT JOIN Interesse i ON i.idAnimal = a.idAnimal
GROUP BY
    c.idConta,
    c.nome,
    c.cidade,
    c.estado,
    cp.idConta,
    cp.nome;

-- Visão 2: compara procura explícita, oferta e interesse por raça.
-- COUNT(DISTINCT ...) evita que relações 1:N multipliquem as métricas.
DROP VIEW IF EXISTS vw_oferta_demanda_por_raca;

CREATE VIEW vw_oferta_demanda_por_raca AS
SELECT
    r.idRaca,
    r.nome AS racaNome,
    r.especie,
    COUNT(DISTINCT p.idPreferencia) AS totalPreferencias,
    COUNT(DISTINCT a.idAnimal) AS totalAnimais,
    COUNT(DISTINCT CASE WHEN a.disponibilidade = 1 THEN a.idAnimal END) AS animaisDisponiveis,
    COUNT(DISTINCT CASE WHEN a.disponibilidade = 0 THEN a.idAnimal END) AS animaisIndisponiveis,
    COUNT(DISTINCT i.idConta) AS usuariosInteressados,
    COUNT(DISTINCT i.idConta, i.idAnimal) AS totalInteresses,
    COUNT(DISTINCT CASE WHEN a.disponibilidade = 1 THEN a.idAnimal END)
        - COUNT(DISTINCT p.idPreferencia) AS saldoOferta,
    CASE
        WHEN COUNT(DISTINCT CASE WHEN a.disponibilidade = 1 THEN a.idAnimal END)
                < COUNT(DISTINCT p.idPreferencia) THEN 'Deficit de oferta'
        WHEN COUNT(DISTINCT CASE WHEN a.disponibilidade = 1 THEN a.idAnimal END)
                > COUNT(DISTINCT p.idPreferencia) THEN 'Superavit de oferta'
        ELSE 'Oferta equilibrada'
    END AS situacaoOferta
FROM Raca r
LEFT JOIN Preferencia p ON p.idRaca = r.idRaca
LEFT JOIN Animal a ON a.idRaca = r.idRaca
LEFT JOIN Interesse i ON i.idAnimal = a.idAnimal
GROUP BY
    r.idRaca,
    r.nome,
    r.especie;
