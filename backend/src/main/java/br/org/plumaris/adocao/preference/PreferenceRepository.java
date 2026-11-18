package br.org.plumaris.adocao.preference;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;

import br.org.plumaris.adocao.database.DatabaseConnectionFactory;
import br.org.plumaris.adocao.database.DatabaseException;

@Repository
public class PreferenceRepository {

    private static final String SELECT_SQL = """
            SELECT p.idPreferencia, p.idConta, u.nome AS usuario, p.especieDesejada, p.porteDesejado,
                   p.idadeMinima, p.idadeMaxima, p.sexoDesejado, p.corDesejada, p.idRaca, r.nome AS raca
            FROM Preferencia p
            JOIN Usuario u ON u.idConta = p.idConta
            LEFT JOIN Raca r ON r.idRaca = p.idRaca
            """;

    private static final String INSERT_SQL = """
            INSERT INTO Preferencia
                (idConta, especieDesejada, porteDesejado, idadeMinima, idadeMaxima, sexoDesejado, corDesejada, idRaca)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """;

    private static final String UPDATE_SQL = """
            UPDATE Preferencia
            SET idConta = ?, especieDesejada = ?, porteDesejado = ?, idadeMinima = ?,
                idadeMaxima = ?, sexoDesejado = ?, corDesejada = ?, idRaca = ?
            WHERE idPreferencia = ?
            """;

    private static final String DELETE_SQL = "DELETE FROM Preferencia WHERE idPreferencia = ?";

    private final DatabaseConnectionFactory connectionFactory;

    public PreferenceRepository(DatabaseConnectionFactory connectionFactory) {
        this.connectionFactory = connectionFactory;
    }

    public List<PreferenceResponse> findAll() {
        List<PreferenceResponse> preferences = new ArrayList<>();
        try (Connection connection = connectionFactory.openConnection();
                PreparedStatement statement = connection.prepareStatement(
                        SELECT_SQL + "ORDER BY u.nome, p.idPreferencia");
                ResultSet results = statement.executeQuery()) {
            while (results.next()) {
                preferences.add(mapPreference(results));
            }
            return preferences;
        } catch (SQLException exception) {
            throw DatabaseException.from(exception);
        }
    }

    public Optional<PreferenceResponse> findById(int id) {
        try (Connection connection = connectionFactory.openConnection()) {
            return findById(connection, id);
        } catch (SQLException exception) {
            throw DatabaseException.from(exception);
        }
    }

    private Optional<PreferenceResponse> findById(Connection connection, int id) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(SELECT_SQL + "WHERE p.idPreferencia = ?")) {
            statement.setInt(1, id);
            try (ResultSet results = statement.executeQuery()) {
                return results.next() ? Optional.of(mapPreference(results)) : Optional.empty();
            }
        }
    }

    public PreferenceResponse create(PreferenceRequest request) {
        return save(request, null).orElseThrow();
    }

    public Optional<PreferenceResponse> update(int id, PreferenceRequest request) {
        return save(request, id);
    }

    private Optional<PreferenceResponse> save(PreferenceRequest request, Integer id) {
        try (Connection connection = connectionFactory.openConnection()) {
            connection.setAutoCommit(false);
            try {
                validateReferences(connection, request);
                int savedId;
                if (id == null) {
                    savedId = insert(connection, request);
                } else {
                    update(connection, id, request);
                    savedId = id;
                }
                Optional<PreferenceResponse> preference = findById(connection, savedId);
                if (id == null && preference.isEmpty()) {
                    throw new IllegalStateException("Created preference not found");
                }
                connection.commit();
                return preference;
            } catch (SQLException | RuntimeException exception) {
                try {
                    connection.rollback();
                } catch (SQLException rollbackFailure) {
                    exception.addSuppressed(rollbackFailure);
                }
                throw exception;
            }
        } catch (SQLException exception) {
            throw DatabaseException.from(exception);
        }
    }

    private static int insert(Connection connection, PreferenceRequest request) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(INSERT_SQL, Statement.RETURN_GENERATED_KEYS)) {
            bindPreference(statement, request);
            statement.executeUpdate();
            try (ResultSet keys = statement.getGeneratedKeys()) {
                if (!keys.next()) {
                    throw new IllegalStateException("Created preference has no generated ID");
                }
                return keys.getInt(1);
            }
        }
    }

    private static void update(Connection connection, int id, PreferenceRequest request) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(UPDATE_SQL)) {
            bindPreference(statement, request);
            statement.setInt(9, id);
            statement.executeUpdate();
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

    private static void validateReferences(Connection connection, PreferenceRequest request) throws SQLException {
        // Keep the references stable until the write, including the breed's species.
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT idConta FROM Usuario WHERE idConta = ? FOR SHARE")) {
            statement.setInt(1, request.userId());
            try (ResultSet results = statement.executeQuery()) {
                if (!results.next()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Usuário não encontrado.");
                }
            }
        }
        if (request.breedId() != null) {
            try (PreparedStatement statement = connection.prepareStatement(
                    "SELECT especie FROM Raca WHERE idRaca = ? FOR SHARE")) {
                statement.setInt(1, request.breedId());
                try (ResultSet results = statement.executeQuery()) {
                    if (!results.next()) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Raça não encontrada.");
                    }
                    if (request.desiredSpecies() != null && !request.desiredSpecies().equals(results.getString("especie"))) {
                        throw new ResponseStatusException(
                                HttpStatus.BAD_REQUEST, "A raça selecionada não corresponde à espécie desejada.");
                    }
                }
            }
        }
    }

    private static void bindPreference(PreparedStatement statement, PreferenceRequest request) throws SQLException {
        statement.setInt(1, request.userId());
        statement.setString(2, request.desiredSpecies());
        statement.setString(3, request.desiredSize());
        statement.setObject(4, request.minimumAge(), Types.INTEGER);
        statement.setObject(5, request.maximumAge(), Types.INTEGER);
        statement.setString(6, request.desiredSex());
        statement.setString(7, request.desiredColor());
        statement.setObject(8, request.breedId(), Types.INTEGER);
    }

    private static PreferenceResponse mapPreference(ResultSet results) throws SQLException {
        return new PreferenceResponse(
                results.getInt("idPreferencia"),
                results.getInt("idConta"),
                results.getString("usuario"),
                results.getString("especieDesejada"),
                results.getString("porteDesejado"),
                results.getObject("idadeMinima", Integer.class),
                results.getObject("idadeMaxima", Integer.class),
                results.getString("sexoDesejado"),
                results.getString("corDesejada"),
                results.getObject("idRaca", Integer.class),
                results.getString("raca")
        );
    }
}
