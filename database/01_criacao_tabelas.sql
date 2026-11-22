SET NAMES utf8mb4;

CREATE TABLE Conta (
    idConta INT NOT NULL AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    senha VARCHAR(255) NOT NULL,
    dataCadastro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_conta PRIMARY KEY (idConta),
    CONSTRAINT uq_conta_email UNIQUE (email),
    CONSTRAINT ck_conta_email CHECK (email LIKE '%_@_%._%'),
    CONSTRAINT ck_conta_senha CHECK (CHAR_LENGTH(senha) >= 20)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Usuario (
    idConta INT NOT NULL,
    nome VARCHAR(120) NOT NULL,
    dataNascimento DATE,
    renda DECIMAL(10,2),
    rua VARCHAR(120),
    numero VARCHAR(20),
    bairro VARCHAR(80),
    cidade VARCHAR(80),
    estado CHAR(2),
    cep CHAR(8),
    CONSTRAINT pk_usuario PRIMARY KEY (idConta),
    CONSTRAINT ck_usuario_nome CHECK (CHAR_LENGTH(TRIM(nome)) > 0),
    CONSTRAINT ck_usuario_renda CHECK (renda >= 0),
    CONSTRAINT ck_usuario_cep CHECK (cep REGEXP '^[0-9]{8}$'),
    CONSTRAINT ck_usuario_estado CHECK (estado IN ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
    CONSTRAINT fk_usuario_conta FOREIGN KEY (idConta) REFERENCES Conta(idConta)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Centro_Adocao (
    idConta INT NOT NULL,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    rua VARCHAR(120),
    numero VARCHAR(20),
    bairro VARCHAR(80),
    cidade VARCHAR(80),
    estado CHAR(2),
    cep CHAR(8),
    CONSTRAINT pk_centro PRIMARY KEY (idConta),
    CONSTRAINT ck_centro_nome CHECK (CHAR_LENGTH(TRIM(nome)) > 0),
    CONSTRAINT ck_centro_cep CHECK (cep REGEXP '^[0-9]{8}$'),
    CONSTRAINT ck_centro_estado CHECK (estado IN ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
    CONSTRAINT fk_centro_conta FOREIGN KEY (idConta) REFERENCES Conta(idConta)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE MeioContato (
    idConta INT NOT NULL,
    meioContato VARCHAR(255) NOT NULL,
    CONSTRAINT pk_meiocontato PRIMARY KEY (idConta, meioContato),
    CONSTRAINT ck_meiocontato_valor CHECK (CHAR_LENGTH(TRIM(meioContato)) > 0),
    CONSTRAINT fk_meiocontato_centro FOREIGN KEY (idConta) REFERENCES Centro_Adocao(idConta)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Raca (
    idRaca INT NOT NULL AUTO_INCREMENT,
    nome VARCHAR(80) NOT NULL,
    especie VARCHAR(30) NOT NULL,
    CONSTRAINT pk_raca PRIMARY KEY (idRaca),
    CONSTRAINT uq_raca_nome_especie UNIQUE (nome, especie),
    CONSTRAINT ck_raca_nome CHECK (CHAR_LENGTH(TRIM(nome)) > 0),
    CONSTRAINT ck_raca_especie CHECK (especie IN ('Cao', 'Gato'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Preferencia (
    idPreferencia INT NOT NULL AUTO_INCREMENT,
    idConta INT NOT NULL,
    especieDesejada VARCHAR(30),
    porteDesejado VARCHAR(20),
    idadeMinima INT,
    idadeMaxima INT,
    sexoDesejado VARCHAR(20),
    corDesejada VARCHAR(50),
    idRaca INT,
    CONSTRAINT pk_preferencia PRIMARY KEY (idPreferencia),
    CONSTRAINT uq_preferencia_usuario UNIQUE (idConta),
    CONSTRAINT ck_pref_especie CHECK (especieDesejada IN ('Cao', 'Gato')),
    CONSTRAINT ck_pref_porte CHECK (porteDesejado IN ('Pequeno', 'Medio', 'Grande')),
    CONSTRAINT ck_pref_sexo CHECK (sexoDesejado IN ('Macho', 'Femea')),
    CONSTRAINT ck_pref_idade_min CHECK (idadeMinima >= 0),
    CONSTRAINT ck_pref_idade_max CHECK (idadeMaxima >= 0),
    CONSTRAINT ck_pref_intervalo CHECK (idadeMinima <= idadeMaxima),
    CONSTRAINT fk_pref_usuario FOREIGN KEY (idConta) REFERENCES Usuario(idConta)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_pref_raca FOREIGN KEY (idRaca) REFERENCES Raca(idRaca)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Animal (
    idAnimal INT NOT NULL AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    especie VARCHAR(30) NOT NULL,
    dataNascimento DATE,
    sexo VARCHAR(20),
    porte VARCHAR(20),
    cor VARCHAR(50),
    descricao TEXT,
    disponibilidade BOOLEAN NOT NULL DEFAULT TRUE,
    idCentro INT NOT NULL,
    idRaca INT,
    CONSTRAINT pk_animal PRIMARY KEY (idAnimal),
    CONSTRAINT ck_animal_nome CHECK (CHAR_LENGTH(TRIM(nome)) > 0),
    CONSTRAINT ck_animal_especie CHECK (especie IN ('Cao', 'Gato')),
    CONSTRAINT ck_animal_sexo CHECK (sexo IN ('Macho', 'Femea')),
    CONSTRAINT ck_animal_porte CHECK (porte IN ('Pequeno', 'Medio', 'Grande')),
    CONSTRAINT ck_animal_disponibilidade CHECK (disponibilidade IN (0, 1)),
    CONSTRAINT fk_animal_centro FOREIGN KEY (idCentro) REFERENCES Centro_Adocao(idConta)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_animal_raca FOREIGN KEY (idRaca) REFERENCES Raca(idRaca)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Foto_Animal (
    idAnimal INT NOT NULL,
    numeroFoto INT NOT NULL,
    url VARCHAR(500),
    descricao VARCHAR(255),
    conteudo MEDIUMBLOB,
    tipoConteudo VARCHAR(10),
    versao CHAR(36),
    CONSTRAINT pk_foto PRIMARY KEY (idAnimal, numeroFoto),
    CONSTRAINT ck_foto_numero CHECK (numeroFoto > 0),
    CONSTRAINT ck_foto_url CHECK (url LIKE 'https://_%' OR url LIKE 'http://_%'),
    CONSTRAINT ck_foto_origem CHECK (
        (url IS NOT NULL AND conteudo IS NULL AND tipoConteudo IS NULL)
        OR (url IS NULL AND conteudo IS NOT NULL AND tipoConteudo IS NOT NULL
            AND tipoConteudo IN ('image/jpeg', 'image/png'))
    ),
    CONSTRAINT fk_foto_animal FOREIGN KEY (idAnimal) REFERENCES Animal(idAnimal)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Interesse (
    idConta INT NOT NULL,
    idAnimal INT NOT NULL,
    dataInteresse DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_interesse PRIMARY KEY (idConta, idAnimal),
    CONSTRAINT fk_interesse_usuario FOREIGN KEY (idConta) REFERENCES Usuario(idConta)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_interesse_animal FOREIGN KEY (idAnimal) REFERENCES Animal(idAnimal)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Vinculado_A (
    idCentroPrincipal INT NOT NULL,
    idCentroUnidade INT NOT NULL,
    CONSTRAINT pk_vinculado PRIMARY KEY (idCentroPrincipal, idCentroUnidade),
    CONSTRAINT uq_vinculado_unidade UNIQUE (idCentroUnidade),
    CONSTRAINT ck_vinculado_distintos CHECK (idCentroPrincipal <> idCentroUnidade),
    CONSTRAINT fk_vinculado_principal FOREIGN KEY (idCentroPrincipal) REFERENCES Centro_Adocao(idConta),
    CONSTRAINT fk_vinculado_unidade FOREIGN KEY (idCentroUnidade) REFERENCES Centro_Adocao(idConta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
