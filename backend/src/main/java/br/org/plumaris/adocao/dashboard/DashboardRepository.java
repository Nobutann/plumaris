package br.org.plumaris.adocao.dashboard;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Repository;

import br.org.plumaris.adocao.dashboard.DashboardStatisticsResponse.BreedSupplyDemand;
import br.org.plumaris.adocao.dashboard.DashboardStatisticsResponse.CenterSummary;
import br.org.plumaris.adocao.dashboard.DashboardStatisticsResponse.MonthlyInterests;
import br.org.plumaris.adocao.database.DatabaseConnectionFactory;
import br.org.plumaris.adocao.database.DatabaseException;

@Repository
class DashboardRepository {

    private static final String ANIMAL_FILTER = """
            (? IS NULL OR a.especie = ?)
            AND (? IS NULL OR a.idCentro = ?)
            AND (? IS NULL OR a.disponibilidade = ?)
            """;

    private static final String REFERENCE_SQL = """
            SELECT CURRENT_DATE AS referenceDate, COUNT(*) AS globalRegisteredCenters
            FROM Centro_Adocao
            """;

    private static final String ANIMALS_BY_AGE_SQL = """
            SELECT a.especie,
                CASE WHEN a.dataNascimento <= ? THEN TIMESTAMPDIFF(YEAR, a.dataNascimento, ?) END AS age,
                COUNT(*) AS total, SUM(a.disponibilidade) AS available
            FROM Animal a
            WHERE
            """ + ANIMAL_FILTER + """
            GROUP BY a.especie, age
            ORDER BY a.especie, age
            """;

    private static final String ANIMALS_BY_CENTER_SQL = """
            SELECT a.idCentro, c.nome, COUNT(*) AS total, SUM(a.disponibilidade) AS available
            FROM Animal a
            JOIN Centro_Adocao c ON c.idConta = a.idCentro
            WHERE
            """ + ANIMAL_FILTER + """
            GROUP BY a.idCentro, c.nome
            ORDER BY c.nome, a.idCentro
            """;

    private static final String SUPPLY_DEMAND_SQL = """
            SELECT r.idRaca, r.nome, r.especie,
                COALESCE(supply.total, 0) AS availableSupply,
                COALESCE(demand.total, 0) AS globalExplicitBreedPreferences
            FROM Raca r
            LEFT JOIN (
                SELECT a.idRaca, COUNT(*) AS total
                FROM Animal a
                WHERE a.disponibilidade = 1 AND a.idRaca IS NOT NULL
                AND
            """ + ANIMAL_FILTER + """
                GROUP BY a.idRaca
            ) supply ON supply.idRaca = r.idRaca
            LEFT JOIN (
                SELECT p.idRaca, COUNT(*) AS total
                FROM Preferencia p
                WHERE p.idRaca IS NOT NULL
                GROUP BY p.idRaca
            ) demand ON demand.idRaca = r.idRaca
            WHERE (? IS NULL OR r.especie = ?)
            ORDER BY r.especie, r.nome, r.idRaca
            """;

    private static final String MONTHLY_INTERESTS_SQL = """
            SELECT DATE_FORMAT(i.dataInteresse, '%Y-%m') AS interestMonth, COUNT(*) AS total
            FROM Interesse i
            JOIN Animal a ON a.idAnimal = i.idAnimal
            WHERE
            """ + ANIMAL_FILTER + """
            AND (? IS NULL OR i.dataInteresse >= ?)
            AND (? IS NULL OR i.dataInteresse < ?)
            GROUP BY interestMonth
            ORDER BY interestMonth
            """;

    private final DatabaseConnectionFactory connectionFactory;

    DashboardRepository(DatabaseConnectionFactory connectionFactory) {
        this.connectionFactory = connectionFactory;
    }

    Snapshot read(DashboardFilters filters) {
        try (Connection connection = connectionFactory.openConnection()) {
            connection.setReadOnly(true);
            connection.setTransactionIsolation(Connection.TRANSACTION_REPEATABLE_READ);
            connection.setAutoCommit(false);

            LocalDate referenceDate;
            long globalRegisteredCenters;
            try (PreparedStatement statement = connection.prepareStatement(REFERENCE_SQL);
                    ResultSet rows = statement.executeQuery()) {
                rows.next();
                referenceDate = rows.getObject("referenceDate", LocalDate.class);
                globalRegisteredCenters = rows.getLong("globalRegisteredCenters");
            }

            Snapshot snapshot = new Snapshot(referenceDate, globalRegisteredCenters,
                    animalsByAge(connection, filters, referenceDate), animalsByCenter(connection, filters),
                    supplyAndDemand(connection, filters), monthlyInterests(connection, filters));
            connection.commit();
            return snapshot;
        } catch (SQLException exception) {
            throw DatabaseException.from(exception);
        }
    }

    private List<AgeBucket> animalsByAge(Connection connection, DashboardFilters filters, LocalDate referenceDate)
            throws SQLException {
        List<AgeBucket> ages = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(ANIMALS_BY_AGE_SQL)) {
            statement.setObject(1, referenceDate, Types.DATE);
            statement.setObject(2, referenceDate, Types.DATE);
            bindAnimalFilters(statement, 3, filters);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    ages.add(new AgeBucket(rows.getString("especie"), rows.getObject("age", Integer.class),
                            rows.getLong("total"), rows.getLong("available")));
                }
            }
        }
        return ages;
    }

    private List<CenterSummary> animalsByCenter(Connection connection, DashboardFilters filters) throws SQLException {
        List<CenterSummary> centers = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(ANIMALS_BY_CENTER_SQL)) {
            bindAnimalFilters(statement, 1, filters);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    long total = rows.getLong("total");
                    long available = rows.getLong("available");
                    centers.add(new CenterSummary(rows.getInt("idCentro"), rows.getString("nome"),
                            total, available, total - available));
                }
            }
        }
        return centers;
    }

    private List<BreedSupplyDemand> supplyAndDemand(Connection connection, DashboardFilters filters)
            throws SQLException {
        List<BreedSupplyDemand> breeds = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(SUPPLY_DEMAND_SQL)) {
            int out = bindAnimalFilters(statement, 1, filters);
            bindOptional(statement, out, filters.species(), Types.VARCHAR);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    breeds.add(new BreedSupplyDemand(rows.getInt("idRaca"), rows.getString("nome"),
                            rows.getString("especie"), rows.getLong("availableSupply"),
                            rows.getLong("globalExplicitBreedPreferences")));
                }
            }
        }
        return breeds;
    }

    private List<MonthlyInterests> monthlyInterests(Connection connection, DashboardFilters filters)
            throws SQLException {
        List<MonthlyInterests> months = new ArrayList<>();
        LocalDate end = filters.endDate();
        LocalDate endExclusive = end == null || end.equals(LocalDate.of(9999, 12, 31)) ? null : end.plusDays(1);
        try (PreparedStatement statement = connection.prepareStatement(MONTHLY_INTERESTS_SQL)) {
            int startIndex = bindAnimalFilters(statement, 1, filters);
            int endIndex = bindOptional(statement, startIndex, filters.startDate(), Types.DATE);
            bindOptional(statement, endIndex, endExclusive, Types.DATE);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    months.add(new MonthlyInterests(rows.getString("interestMonth"), rows.getLong("total")));
                }
            }
        }
        return months;
    }

    private int bindAnimalFilters(PreparedStatement statement, int index, DashboardFilters filters)
            throws SQLException {
        int centerIndex = bindOptional(statement, index, filters.species(), Types.VARCHAR);
        int availabilityIndex = bindOptional(statement, centerIndex, filters.centerId(), Types.INTEGER);
        return bindOptional(statement, availabilityIndex, filters.available(), Types.BOOLEAN);
    }

    private int bindOptional(PreparedStatement statement, int index, Object value, int sqlType) throws SQLException {
        statement.setObject(index, value, sqlType);
        statement.setObject(index + 1, value, sqlType);
        return index + 2;
    }

    record AgeBucket(String species, Integer age, long total, long available) {
    }

    record Snapshot(LocalDate referenceDate, long globalRegisteredCenters, List<AgeBucket> ageBuckets,
            List<CenterSummary> centers, List<BreedSupplyDemand> breeds, List<MonthlyInterests> monthlyInterests) {
    }
}
