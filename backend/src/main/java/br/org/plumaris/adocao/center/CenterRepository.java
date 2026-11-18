package br.org.plumaris.adocao.center;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import br.org.plumaris.adocao.database.DatabaseConnectionFactory;
import br.org.plumaris.adocao.database.DatabaseException;

@Repository
public class CenterRepository {

    private static final String FIND_ALL_SQL = """
            SELECT idConta, nome, email, descricao, rua, numero, bairro, cidade, estado, cep
            FROM Centro_Adocao JOIN Conta USING (idConta)
            ORDER BY nome, idConta
            """;
    private static final String FIND_BY_ID_SQL = """
            SELECT idConta, nome, email, descricao, rua, numero, bairro, cidade, estado, cep
            FROM Centro_Adocao JOIN Conta USING (idConta)
            WHERE idConta = ?
            """;
    private static final String INSERT_ACCOUNT_SQL = "INSERT INTO Conta (email, senha) VALUES (?, ?)";
    private static final String INSERT_CENTER_SQL = """
            INSERT INTO Centro_Adocao (nome, descricao, rua, numero, bairro, cidade, estado, cep, idConta)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;
    private static final String LOCK_CENTER_SQL = """
            SELECT Conta.idConta FROM Conta JOIN Centro_Adocao USING (idConta)
            WHERE Conta.idConta = ? FOR UPDATE
            """;
    private static final String UPDATE_ACCOUNT_SQL = "UPDATE Conta SET email = ? WHERE idConta = ?";
    private static final String UPDATE_CENTER_SQL = """
            UPDATE Centro_Adocao SET nome = ?, descricao = ?, rua = ?, numero = ?, bairro = ?,
                cidade = ?, estado = ?, cep = ? WHERE idConta = ?
            """;
    private static final String DELETE_CENTER_SQL = "DELETE FROM Centro_Adocao WHERE idConta = ?";
    private static final String DELETE_EXCLUSIVE_ACCOUNT_SQL = """
            DELETE FROM Conta WHERE idConta = ?
                AND NOT EXISTS (SELECT 1 FROM Usuario WHERE Usuario.idConta = Conta.idConta)
            """;

    private final DatabaseConnectionFactory connectionFactory;

    public CenterRepository(DatabaseConnectionFactory connectionFactory) {
        this.connectionFactory = connectionFactory;
    }

    public List<CenterResponse> findAll() {
        List<CenterResponse> centers = new ArrayList<>();
        try (Connection connection = connectionFactory.openConnection();
                PreparedStatement statement = connection.prepareStatement(FIND_ALL_SQL);
                ResultSet results = statement.executeQuery()) {
            while (results.next()) {
                centers.add(mapCenter(results));
            }
            return centers;
        } catch (SQLException exception) {
            throw DatabaseException.from(exception);
        }
    }

    public Optional<CenterResponse> findById(int id) {
        try (Connection connection = connectionFactory.openConnection()) {
            return findById(connection, id);
        } catch (SQLException exception) {
            throw DatabaseException.from(exception);
        }
    }

    public CenterResponse create(CenterRequest request, String passwordHash) {
        try (Connection connection = connectionFactory.openConnection()) {
            connection.setAutoCommit(false);
            try {
                int id = insertAccount(connection, request.email(), passwordHash);
                writeCenter(connection, INSERT_CENTER_SQL, id, request);
                CenterResponse center = findById(connection, id).orElseThrow();
                connection.commit();
                return center;
            } catch (SQLException | RuntimeException exception) {
                rollback(connection, exception);
                throw exception;
            }
        } catch (SQLException exception) {
            throw DatabaseException.from(exception);
        }
    }

    public Optional<CenterResponse> update(int id, CenterRequest request) {
        try (Connection connection = connectionFactory.openConnection()) {
            connection.setAutoCommit(false);
            try {
                if (!lockCenter(connection, id)) {
                    connection.rollback();
                    return Optional.empty();
                }
                try (PreparedStatement statement = connection.prepareStatement(UPDATE_ACCOUNT_SQL)) {
                    statement.setString(1, request.email());
                    statement.setInt(2, id);
                    statement.executeUpdate();
                }
                writeCenter(connection, UPDATE_CENTER_SQL, id, request);
                CenterResponse center = findById(connection, id).orElseThrow();
                connection.commit();
                return Optional.of(center);
            } catch (SQLException | RuntimeException exception) {
                rollback(connection, exception);
                throw exception;
            }
        } catch (SQLException exception) {
            throw DatabaseException.from(exception);
        }
    }

    public boolean delete(int id) {
        try (Connection connection = connectionFactory.openConnection()) {
            connection.setAutoCommit(false);
            try {
                if (!lockCenter(connection, id)) {
                    connection.rollback();
                    return false;
                }
                try (PreparedStatement statement = connection.prepareStatement(DELETE_CENTER_SQL)) {
                    statement.setInt(1, id);
                    statement.executeUpdate();
                }
                // The account lock prevents a concurrent Usuario insert until this transaction ends.
                try (PreparedStatement statement = connection.prepareStatement(DELETE_EXCLUSIVE_ACCOUNT_SQL)) {
                    statement.setInt(1, id);
                    statement.executeUpdate();
                }
                connection.commit();
                return true;
            } catch (SQLException | RuntimeException exception) {
                rollback(connection, exception);
                throw exception;
            }
        } catch (SQLException exception) {
            throw DatabaseException.from(exception);
        }
    }

    private Optional<CenterResponse> findById(Connection connection, int id) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(FIND_BY_ID_SQL)) {
            statement.setInt(1, id);
            try (ResultSet results = statement.executeQuery()) {
                return results.next() ? Optional.of(mapCenter(results)) : Optional.empty();
            }
        }
    }

    private boolean lockCenter(Connection connection, int id) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(LOCK_CENTER_SQL)) {
            statement.setInt(1, id);
            try (ResultSet results = statement.executeQuery()) {
                return results.next();
            }
        }
    }

    private int insertAccount(Connection connection, String email, String passwordHash) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(INSERT_ACCOUNT_SQL, Statement.RETURN_GENERATED_KEYS)) {
            statement.setString(1, email);
            statement.setString(2, passwordHash);
            statement.executeUpdate();
            try (ResultSet keys = statement.getGeneratedKeys()) {
                if (keys.next()) {
                    return keys.getInt(1);
                }
                throw new SQLException("Account insert did not return a generated key");
            }
        }
    }

    private void writeCenter(Connection connection, String sql, int id, CenterRequest request) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, request.name());
            statement.setString(2, request.description());
            statement.setString(3, request.street());
            statement.setString(4, request.number());
            statement.setString(5, request.neighborhood());
            statement.setString(6, request.city());
            statement.setString(7, request.state());
            statement.setString(8, request.postalCode());
            statement.setInt(9, id);
            statement.executeUpdate();
        }
    }

    private CenterResponse mapCenter(ResultSet results) throws SQLException {
        return new CenterResponse(results.getInt("idConta"), results.getString("nome"), results.getString("email"),
                results.getString("descricao"), results.getString("rua"), results.getString("numero"),
                results.getString("bairro"), results.getString("cidade"), results.getString("estado"), results.getString("cep"));
    }

    private void rollback(Connection connection, Exception exception) {
        try {
            connection.rollback();
        } catch (SQLException rollbackFailure) {
            exception.addSuppressed(rollbackFailure);
        }
    }
}
