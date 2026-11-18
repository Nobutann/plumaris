package br.org.plumaris.adocao.animal;

import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import br.org.plumaris.adocao.database.DatabaseConnectionFactory;
import br.org.plumaris.adocao.database.DatabaseException;

@Repository
public class AnimalRepository {

    private static final String ANIMAL_FILTERS_SQL = """
            WHERE (? IS NULL OR a.especie = ?)
                AND (? IS NULL OR a.idCentro = ?)
                AND (? IS NULL OR a.disponibilidade = ?)
            """;

    private static final String FIND_ALL_SQL = """
            SELECT
                a.idAnimal,
                a.nome,
                a.especie,
                a.dataNascimento,
                a.sexo,
                a.porte,
                a.cor,
                a.descricao,
                a.disponibilidade,
                a.idCentro,
                c.nome AS centroNome,
                a.idRaca,
                r.nome AS racaNome
            FROM Animal a
            JOIN Centro_Adocao c ON c.idConta = a.idCentro
            LEFT JOIN Raca r ON r.idRaca = a.idRaca
            """ + ANIMAL_FILTERS_SQL + """
            ORDER BY a.idAnimal
            """;

    private static final String FIND_BY_ID_SQL = """
            SELECT
                a.idAnimal,
                a.nome,
                a.especie,
                a.dataNascimento,
                a.sexo,
                a.porte,
                a.cor,
                a.descricao,
                a.disponibilidade,
                a.idCentro,
                c.nome AS centroNome,
                a.idRaca,
                r.nome AS racaNome
            FROM Animal a
            JOIN Centro_Adocao c ON c.idConta = a.idCentro
            LEFT JOIN Raca r ON r.idRaca = a.idRaca
            WHERE a.idAnimal = ?
            """;

    private static final String SPECIES_SUMMARY_SQL = """
            SELECT
                a.especie,
                COUNT(*) AS total,
                SUM(CASE WHEN a.disponibilidade = 1 THEN 1 ELSE 0 END) AS available,
                SUM(CASE WHEN a.disponibilidade = 0 THEN 1 ELSE 0 END) AS unavailable
            FROM Animal a
            """ + ANIMAL_FILTERS_SQL + """
            GROUP BY a.especie
            ORDER BY a.especie
            """;

    private static final String AGE_GROUP_SUMMARY_SQL = """
            SELECT
                a.especie,
                CASE
                    WHEN a.dataNascimento IS NULL OR a.dataNascimento > CURDATE() THEN 'Unknown'
                    WHEN TIMESTAMPDIFF(YEAR, a.dataNascimento, CURDATE()) < 2 THEN '0-1'
                    WHEN TIMESTAMPDIFF(YEAR, a.dataNascimento, CURDATE()) < 5 THEN '2-4'
                    ELSE '5+'
                END AS ageGroup,
                COUNT(*) AS total
            FROM Animal a
            """ + ANIMAL_FILTERS_SQL + """
            GROUP BY a.especie, ageGroup
            ORDER BY a.especie, ageGroup
            """;

    private static final String FIND_RECOMMENDED_SQL = """
            SELECT
                a.idAnimal,
                a.nome,
                a.especie,
                a.dataNascimento,
                a.sexo,
                a.porte,
                a.cor,
                a.descricao,
                a.disponibilidade,
                a.idCentro,
                c.nome AS centroNome,
                a.idRaca,
                r.nome AS racaNome
            FROM Preferencia p
            JOIN Animal a ON a.disponibilidade = 1
                AND (p.especieDesejada IS NULL OR a.especie = p.especieDesejada)
            JOIN Centro_Adocao c ON c.idConta = a.idCentro
            LEFT JOIN Raca r ON r.idRaca = a.idRaca
            WHERE p.idConta = ?
                AND (p.porteDesejado IS NULL OR a.porte = p.porteDesejado)
                AND (p.sexoDesejado IS NULL OR a.sexo = p.sexoDesejado)
                AND (p.corDesejada IS NULL OR a.cor = p.corDesejada)
                AND (p.idRaca IS NULL OR a.idRaca = p.idRaca)
                AND (p.idadeMinima IS NULL OR (
                    a.dataNascimento <= CURDATE()
                    AND TIMESTAMPDIFF(YEAR, a.dataNascimento, CURDATE()) >= p.idadeMinima
                ))
                AND (p.idadeMaxima IS NULL OR (
                    a.dataNascimento <= CURDATE()
                    AND TIMESTAMPDIFF(YEAR, a.dataNascimento, CURDATE()) <= p.idadeMaxima
                ))
            ORDER BY a.idAnimal
            """;

    private static final String INSERT_SQL = """
            INSERT INTO Animal (
                nome, especie, dataNascimento, sexo, porte, cor, descricao,
                disponibilidade, idCentro, idRaca
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;

    private static final String UPDATE_SQL = """
            UPDATE Animal
            SET nome = ?, especie = ?, dataNascimento = ?, sexo = ?, porte = ?,
                cor = ?, descricao = ?, disponibilidade = ?, idCentro = ?, idRaca = ?
            WHERE idAnimal = ?
            """;

    private static final String DELETE_SQL = """
            DELETE FROM Animal
            WHERE idAnimal = ?
            """;

    private static final String CENTER_EXISTS_SQL = """
            SELECT COUNT(*)
            FROM Centro_Adocao
            WHERE idConta = ?
            """;

    private static final String FIND_BREED_SPECIES_SQL = """
            SELECT especie
            FROM Raca
            WHERE idRaca = ?
            """;

    private final DatabaseConnectionFactory connectionFactory;

    public AnimalRepository(DatabaseConnectionFactory connectionFactory) {
        this.connectionFactory = connectionFactory;
    }

    public List<AnimalResponse> findAll(String species, Integer centerId, Boolean available) {
        List<AnimalResponse> animals = new ArrayList<>();
        try (Connection connection = connectionFactory.openConnection();
                PreparedStatement statement = connection.prepareStatement(FIND_ALL_SQL)) {
            bindAnimalFilters(statement, species, centerId, available);
            try (ResultSet results = statement.executeQuery()) {
                while (results.next()) {
                    animals.add(mapAnimal(results));
                }
                return animals;
            }
        } catch (SQLException exception) {
            throw DatabaseException.from(exception);
        }
    }

    public Optional<AnimalResponse> findById(int id) {
        try (Connection connection = connectionFactory.openConnection();
                PreparedStatement statement = connection.prepareStatement(FIND_BY_ID_SQL)) {
            statement.setInt(1, id);
            try (ResultSet results = statement.executeQuery()) {
                return results.next() ? Optional.of(mapAnimal(results)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw DatabaseException.from(exception);
        }
    }

    public List<AnimalSpeciesSummary> summarizeBySpecies(String species, Integer centerId, Boolean available) {
        List<AnimalSpeciesSummary> summaries = new ArrayList<>();
        try (Connection connection = connectionFactory.openConnection();
                PreparedStatement statement = connection.prepareStatement(SPECIES_SUMMARY_SQL)) {
            bindAnimalFilters(statement, species, centerId, available);
            try (ResultSet results = statement.executeQuery()) {
                while (results.next()) {
                    summaries.add(new AnimalSpeciesSummary(
                            results.getString("especie"),
                            results.getLong("total"),
                            results.getLong("available"),
                            results.getLong("unavailable")));
                }
                return summaries;
            }
        } catch (SQLException exception) {
            throw DatabaseException.from(exception);
        }
    }

    public List<AnimalAgeGroupSummary> summarizeByAgeGroup(String species, Integer centerId, Boolean available) {
        List<AnimalAgeGroupSummary> summaries = new ArrayList<>();
        try (Connection connection = connectionFactory.openConnection();
                PreparedStatement statement = connection.prepareStatement(AGE_GROUP_SUMMARY_SQL)) {
            bindAnimalFilters(statement, species, centerId, available);
            try (ResultSet results = statement.executeQuery()) {
                while (results.next()) {
                    summaries.add(new AnimalAgeGroupSummary(
                            results.getString("especie"),
                            results.getString("ageGroup"),
                            results.getLong("total")));
                }
                return summaries;
            }
        } catch (SQLException exception) {
            throw DatabaseException.from(exception);
        }
    }

    public List<AnimalResponse> findRecommendedForUser(int userId) {
        List<AnimalResponse> animals = new ArrayList<>();
        try (Connection connection = connectionFactory.openConnection();
                PreparedStatement statement = connection.prepareStatement(FIND_RECOMMENDED_SQL)) {
            statement.setInt(1, userId);
            try (ResultSet results = statement.executeQuery()) {
                while (results.next()) {
                    animals.add(mapAnimal(results));
                }
            }
            return animals;
        } catch (SQLException exception) {
            throw DatabaseException.from(exception);
        }
    }

    public int create(AnimalRequest request) {
        try (Connection connection = connectionFactory.openConnection();
                PreparedStatement statement = connection.prepareStatement(INSERT_SQL, Statement.RETURN_GENERATED_KEYS)) {
            bindAnimal(statement, request);
            statement.executeUpdate();
            try (ResultSet keys = statement.getGeneratedKeys()) {
                if (!keys.next()) {
                    throw new IllegalStateException("Created animal has no generated ID");
                }
                return keys.getInt(1);
            }
        } catch (SQLException exception) {
            throw DatabaseException.from(exception);
        }
    }

    public void update(int id, AnimalRequest request) {
        try (Connection connection = connectionFactory.openConnection();
                PreparedStatement statement = connection.prepareStatement(UPDATE_SQL)) {
            bindAnimal(statement, request);
            statement.setInt(11, id);
            statement.executeUpdate();
        } catch (SQLException exception) {
            throw DatabaseException.from(exception);
        }
    }

    public boolean delete(int id) {
        try (Connection connection = connectionFactory.openConnection();
                PreparedStatement statement = connection.prepareStatement(DELETE_SQL)) {
            statement.setInt(1, id);
            return statement.executeUpdate() > 0;
        } catch (SQLException exception) {
            throw DatabaseException.from(exception);
        }
    }

    public boolean centerExists(int centerId) {
        try (Connection connection = connectionFactory.openConnection();
                PreparedStatement statement = connection.prepareStatement(CENTER_EXISTS_SQL)) {
            statement.setInt(1, centerId);
            try (ResultSet results = statement.executeQuery()) {
                return results.next() && results.getInt(1) > 0;
            }
        } catch (SQLException exception) {
            throw DatabaseException.from(exception);
        }
    }

    public Optional<String> findBreedSpecies(int breedId) {
        try (Connection connection = connectionFactory.openConnection();
                PreparedStatement statement = connection.prepareStatement(FIND_BREED_SPECIES_SQL)) {
            statement.setInt(1, breedId);
            try (ResultSet results = statement.executeQuery()) {
                return results.next() ? Optional.of(results.getString("especie")) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw DatabaseException.from(exception);
        }
    }

    private static void bindAnimalFilters(PreparedStatement statement, String species, Integer centerId,
            Boolean available) throws SQLException {
        statement.setString(1, species);
        statement.setString(2, species);
        statement.setObject(3, centerId, Types.INTEGER);
        statement.setObject(4, centerId, Types.INTEGER);
        statement.setObject(5, available, Types.BOOLEAN);
        statement.setObject(6, available, Types.BOOLEAN);
    }

    private static void bindAnimal(PreparedStatement statement, AnimalRequest request) throws SQLException {
        statement.setString(1, request.normalizedName());
        statement.setString(2, request.species());

        if (request.birthDate() == null) {
            statement.setNull(3, Types.DATE);
        } else {
            statement.setDate(3, Date.valueOf(request.birthDate()));
        }

        setNullableString(statement, 4, request.sex());
        setNullableString(statement, 5, request.size());
        setNullableString(statement, 6, request.color());
        setNullableString(statement, 7, request.description());
        statement.setBoolean(8, request.available());
        statement.setInt(9, request.centerId());

        if (request.breedId() == null) {
            statement.setNull(10, Types.INTEGER);
        } else {
            statement.setInt(10, request.breedId());
        }
    }

    private static void setNullableString(PreparedStatement statement, int index, String value) throws SQLException {
        if (value == null) {
            statement.setNull(index, Types.VARCHAR);
        } else {
            statement.setString(index, value);
        }
    }

    private static AnimalResponse mapAnimal(ResultSet resultSet) throws SQLException {
        Date birthDate = resultSet.getDate("dataNascimento");

        return new AnimalResponse(
                resultSet.getInt("idAnimal"),
                resultSet.getString("nome"),
                resultSet.getString("especie"),
                birthDate == null ? null : birthDate.toLocalDate(),
                resultSet.getString("sexo"),
                resultSet.getString("porte"),
                resultSet.getString("cor"),
                resultSet.getString("descricao"),
                resultSet.getBoolean("disponibilidade"),
                resultSet.getInt("idCentro"),
                resultSet.getString("centroNome"),
                resultSet.getObject("idRaca", Integer.class),
                resultSet.getString("racaNome")
        );
    }
}
