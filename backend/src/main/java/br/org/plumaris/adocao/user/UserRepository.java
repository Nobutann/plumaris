package br.org.plumaris.adocao.user;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Repository;

import br.org.plumaris.adocao.database.DatabaseConnectionFactory;
import br.org.plumaris.adocao.database.DatabaseException;

@Repository
public class UserRepository {

    private final DatabaseConnectionFactory connectionFactory;

    public UserRepository(DatabaseConnectionFactory connectionFactory) {
        this.connectionFactory = connectionFactory;
    }

    public List<UserSummary> findAll() {
        List<UserSummary> users = new ArrayList<>();
        try (Connection connection = connectionFactory.openConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "SELECT idConta, nome FROM Usuario ORDER BY nome, idConta");
                ResultSet results = statement.executeQuery()) {
            while (results.next()) {
                users.add(new UserSummary(results.getInt("idConta"), results.getString("nome")));
            }
            return users;
        } catch (SQLException exception) {
            throw DatabaseException.from(exception);
        }
    }
}
