USE adocao_bd;

ALTER TABLE Foto_Animal
    MODIFY COLUMN url VARCHAR(500) NULL,
    ADD COLUMN conteudo MEDIUMBLOB,
    ADD COLUMN tipoConteudo VARCHAR(10),
    ADD COLUMN versao CHAR(36),
    ADD CONSTRAINT ck_foto_origem CHECK (
        (url IS NOT NULL AND conteudo IS NULL AND tipoConteudo IS NULL)
        OR (url IS NULL AND conteudo IS NOT NULL AND tipoConteudo IS NOT NULL
            AND tipoConteudo IN ('image/jpeg', 'image/png'))
    );
