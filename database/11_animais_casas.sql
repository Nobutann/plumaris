USE adocao_bd;
SET NAMES utf8mb4;

-- Centros informados para os animais. As contas recebem senhas aleatorias por instalacao.
SET @casa_rayza_id = (
    SELECT idConta FROM Centro_Adocao
    WHERE LOWER(TRIM(nome)) = LOWER('Casa Rayza')
    LIMIT 1
);
INSERT INTO Conta (email, senha)
SELECT 'casa.rayza@plumaris.local', UUID()
WHERE @casa_rayza_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM Conta WHERE email = 'casa.rayza@plumaris.local');
SET @casa_rayza_id = COALESCE(
    @casa_rayza_id,
    (SELECT idConta FROM Conta WHERE email = 'casa.rayza@plumaris.local' LIMIT 1)
);
INSERT INTO Centro_Adocao (idConta, nome)
SELECT @casa_rayza_id, 'Casa Rayza'
WHERE NOT EXISTS (SELECT 1 FROM Centro_Adocao WHERE idConta = @casa_rayza_id);

SET @casa_danilo_id = (
    SELECT idConta FROM Centro_Adocao
    WHERE LOWER(TRIM(nome)) = LOWER('Casa Danilo')
    LIMIT 1
);
INSERT INTO Conta (email, senha)
SELECT 'casa.danilo@plumaris.local', UUID()
WHERE @casa_danilo_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM Conta WHERE email = 'casa.danilo@plumaris.local');
SET @casa_danilo_id = COALESCE(
    @casa_danilo_id,
    (SELECT idConta FROM Conta WHERE email = 'casa.danilo@plumaris.local' LIMIT 1)
);
INSERT INTO Centro_Adocao (idConta, nome)
SELECT @casa_danilo_id, 'Casa Danilo'
WHERE NOT EXISTS (SELECT 1 FROM Centro_Adocao WHERE idConta = @casa_danilo_id);

SET @casa_pamala_id = (
    SELECT idConta FROM Centro_Adocao
    WHERE LOWER(TRIM(nome)) = LOWER('Casa Pamala')
    LIMIT 1
);
INSERT INTO Conta (email, senha)
SELECT 'casa.pamala@plumaris.local', UUID()
WHERE @casa_pamala_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM Conta WHERE email = 'casa.pamala@plumaris.local');
SET @casa_pamala_id = COALESCE(
    @casa_pamala_id,
    (SELECT idConta FROM Conta WHERE email = 'casa.pamala@plumaris.local' LIMIT 1)
);
INSERT INTO Centro_Adocao (idConta, nome)
SELECT @casa_pamala_id, 'Casa Pamala'
WHERE NOT EXISTS (SELECT 1 FROM Centro_Adocao WHERE idConta = @casa_pamala_id);

-- Racas informadas para Drax e Temaki.
INSERT INTO Raca (nome, especie)
SELECT 'American Pit Bull Terrier', 'Cao'
WHERE NOT EXISTS (
    SELECT 1 FROM Raca
    WHERE LOWER(TRIM(nome)) = LOWER('American Pit Bull Terrier') AND especie = 'Cao'
);
SET @pitbull_id = (
    SELECT idRaca FROM Raca
    WHERE LOWER(TRIM(nome)) = LOWER('American Pit Bull Terrier') AND especie = 'Cao'
    LIMIT 1
);

INSERT INTO Raca (nome, especie)
SELECT 'SRD', 'Cao'
WHERE NOT EXISTS (
    SELECT 1 FROM Raca
    WHERE LOWER(TRIM(nome)) = LOWER('SRD') AND especie = 'Cao'
);
SET @srd_cao_id = (
    SELECT idRaca FROM Raca
    WHERE LOWER(TRIM(nome)) = LOWER('SRD') AND especie = 'Cao'
    LIMIT 1
);

INSERT INTO Raca (nome, especie)
SELECT 'Siames', 'Gato'
WHERE NOT EXISTS (
    SELECT 1 FROM Raca
    WHERE LOWER(TRIM(nome)) = LOWER('Siames') AND especie = 'Gato'
);
SET @siames_gato_id = (
    SELECT idRaca FROM Raca
    WHERE LOWER(TRIM(nome)) = LOWER('Siames') AND especie = 'Gato'
    LIMIT 1
);

-- Animais: a verificacao por nome, especie, nascimento e centro evita duplicatas.
INSERT INTO Animal (
    nome, especie, dataNascimento, sexo, porte, cor, descricao,
    disponibilidade, idCentro, idRaca
)
SELECT
    'Drax Berenguer', 'Cao', '2024-09-14', NULL, 'Medio', NULL,
    'Peso informado: 28,7 kg. Extremamente docil, carente e atencioso; adora ficar deitado, lamber quem ama e conviver com outros cachorros.',
    TRUE, @casa_rayza_id, @pitbull_id
WHERE NOT EXISTS (
    SELECT 1 FROM Animal
    WHERE LOWER(TRIM(nome)) = LOWER('Drax Berenguer')
      AND especie = 'Cao'
      AND dataNascimento = '2024-09-14'
      AND idCentro = @casa_rayza_id
);
SET @drax_id = (
    SELECT idAnimal FROM Animal
    WHERE LOWER(TRIM(nome)) = LOWER('Drax Berenguer')
      AND especie = 'Cao'
      AND dataNascimento = '2024-09-14'
      AND idCentro = @casa_rayza_id
    ORDER BY idAnimal LIMIT 1
);

INSERT INTO Animal (
    nome, especie, dataNascimento, sexo, porte, cor, descricao,
    disponibilidade, idCentro, idRaca
)
SELECT
    'Temaki Duleba', 'Cao', '2014-01-10', NULL, 'Medio', NULL,
    'Peso informado: 14,9 kg. Companheiro e pidao, adora seguir as pessoas, dormir e ficar no ar-condicionado.',
    TRUE, @casa_danilo_id, @srd_cao_id
WHERE NOT EXISTS (
    SELECT 1 FROM Animal
    WHERE LOWER(TRIM(nome)) = LOWER('Temaki Duleba')
      AND especie = 'Cao'
      AND dataNascimento = '2014-01-10'
      AND idCentro = @casa_danilo_id
);
SET @temaki_id = (
    SELECT idAnimal FROM Animal
    WHERE LOWER(TRIM(nome)) = LOWER('Temaki Duleba')
      AND especie = 'Cao'
      AND dataNascimento = '2014-01-10'
      AND idCentro = @casa_danilo_id
    ORDER BY idAnimal LIMIT 1
);

INSERT INTO Animal (
    nome, especie, dataNascimento, sexo, porte, cor, descricao,
    disponibilidade, idCentro, idRaca
)
SELECT
    'Trix Catita', 'Gato', '2025-11-20', 'Femea', NULL,
    'Tricolor, majoritariamente branca',
    'Peso informado: 2,8 kg. Femea castrada.',
    TRUE, @casa_pamala_id, NULL
WHERE NOT EXISTS (
    SELECT 1 FROM Animal
    WHERE LOWER(TRIM(nome)) = LOWER('Trix Catita')
      AND especie = 'Gato'
      AND dataNascimento = '2025-11-20'
      AND idCentro = @casa_pamala_id
);
SET @trix_id = (
    SELECT idAnimal FROM Animal
    WHERE LOWER(TRIM(nome)) = LOWER('Trix Catita')
      AND especie = 'Gato'
      AND dataNascimento = '2025-11-20'
      AND idCentro = @casa_pamala_id
    ORDER BY idAnimal LIMIT 1
);

INSERT INTO Animal (
    nome, especie, dataNascimento, sexo, porte, cor, descricao,
    disponibilidade, idCentro, idRaca
)
SELECT
    'Yumí', 'Gato', '2025-10-25', 'Femea', NULL,
    'Tabby point, cinza com branco',
    'Peso informado: 2,7 kg. Femea castrada.',
    TRUE, @casa_pamala_id, @siames_gato_id
WHERE NOT EXISTS (
    SELECT 1 FROM Animal
    WHERE LOWER(TRIM(nome)) = LOWER('Yumí')
      AND especie = 'Gato'
      AND dataNascimento = '2025-10-25'
      AND idCentro = @casa_pamala_id
);
SET @yumi_id = (
    SELECT idAnimal FROM Animal
    WHERE LOWER(TRIM(nome)) = LOWER('Yumí')
      AND especie = 'Gato'
      AND dataNascimento = '2025-10-25'
      AND idCentro = @casa_pamala_id
    ORDER BY idAnimal LIMIT 1
);

INSERT INTO Animal (
    nome, especie, dataNascimento, sexo, porte, cor, descricao,
    disponibilidade, idCentro, idRaca
)
SELECT
    'Guido Zoiudin', 'Gato', '2025-11-05', 'Macho', NULL,
    'Laranja com branco',
    'Peso informado: 3 kg. Macho nao castrado.',
    TRUE, @casa_pamala_id, NULL
WHERE NOT EXISTS (
    SELECT 1 FROM Animal
    WHERE LOWER(TRIM(nome)) = LOWER('Guido Zoiudin')
      AND especie = 'Gato'
      AND dataNascimento = '2025-11-05'
      AND idCentro = @casa_pamala_id
);
SET @guido_id = (
    SELECT idAnimal FROM Animal
    WHERE LOWER(TRIM(nome)) = LOWER('Guido Zoiudin')
      AND especie = 'Gato'
      AND dataNascimento = '2025-11-05'
      AND idCentro = @casa_pamala_id
    ORDER BY idAnimal LIMIT 1
);

-- Fotos locais armazenadas como BLOB, o mesmo mecanismo usado pelo upload da aplicacao.
INSERT INTO Foto_Animal (
    idAnimal, numeroFoto, url, descricao, conteudo, tipoConteudo, versao
)
SELECT
    @drax_id, 1, NULL, 'Foto de Drax Berenguer',
    LOAD_FILE('/var/lib/mysql-files/plumaris/drax-berenguer.png'), 'image/png', UUID()
WHERE NOT EXISTS (
    SELECT 1 FROM Foto_Animal WHERE idAnimal = @drax_id AND numeroFoto = 1
);

INSERT INTO Foto_Animal (
    idAnimal, numeroFoto, url, descricao, conteudo, tipoConteudo, versao
)
SELECT
    @temaki_id, 1, NULL, 'Foto de Temaki Duleba',
    LOAD_FILE('/var/lib/mysql-files/plumaris/temaki-duleba.png'), 'image/png', UUID()
WHERE NOT EXISTS (
    SELECT 1 FROM Foto_Animal WHERE idAnimal = @temaki_id AND numeroFoto = 1
);

INSERT INTO Foto_Animal (
    idAnimal, numeroFoto, url, descricao, conteudo, tipoConteudo, versao
)
SELECT
    @trix_id, 1, NULL, 'Foto de Trix Catita',
    LOAD_FILE('/var/lib/mysql-files/plumaris/trix-catita.png'), 'image/png', UUID()
WHERE NOT EXISTS (
    SELECT 1 FROM Foto_Animal WHERE idAnimal = @trix_id AND numeroFoto = 1
);

INSERT INTO Foto_Animal (
    idAnimal, numeroFoto, url, descricao, conteudo, tipoConteudo, versao
)
SELECT
    @yumi_id, 1, NULL, 'Foto de Yumí',
    LOAD_FILE('/var/lib/mysql-files/plumaris/yumi.png'), 'image/png', UUID()
WHERE NOT EXISTS (
    SELECT 1 FROM Foto_Animal WHERE idAnimal = @yumi_id AND numeroFoto = 1
);

INSERT INTO Foto_Animal (
    idAnimal, numeroFoto, url, descricao, conteudo, tipoConteudo, versao
)
SELECT
    @guido_id, 1, NULL, 'Foto de Guido Zoiudin',
    LOAD_FILE('/var/lib/mysql-files/plumaris/guido-zoiudin.png'), 'image/png', UUID()
WHERE NOT EXISTS (
    SELECT 1 FROM Foto_Animal WHERE idAnimal = @guido_id AND numeroFoto = 1
);
