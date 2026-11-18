package br.org.plumaris.adocao.dashboard;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import br.org.plumaris.adocao.animal.AnimalSpeciesSummary;
import br.org.plumaris.adocao.dashboard.DashboardStatisticsResponse.AgeGroupSummary;
import br.org.plumaris.adocao.dashboard.DashboardStatisticsResponse.BreedSupplyDemand;
import br.org.plumaris.adocao.dashboard.DashboardStatisticsResponse.CenterSummary;
import br.org.plumaris.adocao.dashboard.DashboardStatisticsResponse.Indicators;
import br.org.plumaris.adocao.dashboard.DashboardStatisticsResponse.MonthlyInterests;
import br.org.plumaris.adocao.dashboard.DashboardStatisticsResponse.SpeciesAgeBoxplot;
import br.org.plumaris.adocao.database.DatabaseConnectionFactory;

@EnabledIfEnvironmentVariable(named = "PLUMARIS_TEST_MYSQL_URL", matches = "jdbc:mysql://[^/?]+/?")
class DashboardMySqlTest {

    private static final String SCHEMA = "dashboard_test_" + UUID.randomUUID().toString().replace("-", "");
    private static final LocalDate START = LocalDate.of(2026, 1, 1);
    private static final LocalDate END = LocalDate.of(2026, 1, 31);
    private static DatabaseConnectionFactory admin;
    private static boolean schemaCreated;
    private static DashboardService dashboard;
    private static LocalDate referenceDate;

    @BeforeAll
    static void createIsolatedSchema() throws Exception {
        String server = System.getenv("PLUMARIS_TEST_MYSQL_URL").replaceFirst("/$", "");
        String user = System.getenv().getOrDefault("PLUMARIS_TEST_MYSQL_USER", "root");
        String password = System.getenv().getOrDefault("PLUMARIS_TEST_MYSQL_PASSWORD", "");
        admin = new DatabaseConnectionFactory(server + "/", user, password);

        try (Connection connection = admin.openConnection()) {
            assertThat(connection.getMetaData().getDatabaseProductName()).isEqualTo("MySQL");
            execute(connection, "CREATE DATABASE " + SCHEMA);
            schemaCreated = true;
        }
        DatabaseConnectionFactory factory = new DatabaseConnectionFactory(server + "/" + SCHEMA, user, password);
        try (Connection connection = factory.openConnection()) {
            String ddl = Files.readString(Path.of("..", "database", "01_criacao_tabelas.sql"));
            for (String sql : ddl.split(";")) {
                if (!sql.isBlank()) {
                    execute(connection, sql);
                }
            }
            insertFixtures(connection);
            try (PreparedStatement statement = connection.prepareStatement("SELECT CURRENT_DATE");
                    ResultSet rows = statement.executeQuery()) {
                rows.next();
                referenceDate = rows.getObject(1, LocalDate.class);
            }
        }
        dashboard = new DashboardService(new DashboardRepository(factory));
    }

    @AfterAll
    static void removeIsolatedSchema() throws SQLException {
        if (schemaCreated) {
            try (Connection connection = admin.openConnection()) {
                execute(connection, "DROP DATABASE " + SCHEMA);
            }
        }
    }

    @Test
    void countsStockAndRelatedRowsWithoutMultiplyingThem() {
        DashboardStatisticsResponse result = dashboard.statistics(new DashboardFilters(null, null, null, null, null));

        assertThat(result.referenceDate()).isEqualTo(referenceDate);
        assertThat(result.indicators()).isEqualTo(new Indicators(5, 4, 1, 80.0, 2, 3, 7));
        assertThat(result.ageStatistics().validAgeCount()).isEqualTo(3);
        assertThat(result.ageStatistics().excludedAgeCount()).isEqualTo(2);
        assertThat(result.series().animalsBySpecies()).containsExactly(
                new AnimalSpeciesSummary("Cao", 4, 3, 1), new AnimalSpeciesSummary("Gato", 1, 1, 0));
        assertThat(result.series().ageGroups()).containsExactly(new AgeGroupSummary("0-1", 1),
                new AgeGroupSummary("2-4", 1), new AgeGroupSummary("5+", 1), new AgeGroupSummary("Unknown", 2));
        assertThat(result.series().animalsByCenter()).containsExactly(
                new CenterSummary(10, "Centro A", 3, 2, 1), new CenterSummary(11, "Centro B", 2, 2, 0));
        assertThat(result.series().ageBoxplotBySpecies()).containsExactly(
                new SpeciesAgeBoxplot("Cao", 3, 1, 2.5, 4.0, 4.5, 5),
                new SpeciesAgeBoxplot("Gato", 0, null, null, null, null, null));
        assertThat(result.series().supplyDemandByBreed()).containsExactly(
                new BreedSupplyDemand(1, "Com oferta", "Cao", 3, 2),
                new BreedSupplyDemand(2, "Sem oferta", "Cao", 0, 0),
                new BreedSupplyDemand(3, "Com demanda", "Gato", 0, 1));
        assertThat(result.series().interestsByMonth()).containsExactly(
                new MonthlyInterests("2025-12", 1), new MonthlyInterests("2026-01", 4),
                new MonthlyInterests("2026-02", 2));
    }

    @Test
    void appliesAnimalFiltersIndividuallyAndTogetherWithoutFilteringDemand() {
        assertThat(dashboard.statistics(new DashboardFilters("Gato", null, null, null, null)).indicators())
                .isEqualTo(new Indicators(1, 1, 0, 100.0, 1, 3, 1));
        assertThat(dashboard.statistics(new DashboardFilters(null, 10, null, null, null)).indicators())
                .isEqualTo(new Indicators(3, 2, 1, 200.0 / 3, 1, 3, 6));
        assertThat(dashboard.statistics(new DashboardFilters(null, null, false, null, null)).indicators())
                .isEqualTo(new Indicators(1, 0, 1, 0.0, 1, 3, 1));

        DashboardStatisticsResponse filtered = dashboard.statistics(new DashboardFilters("Cao", 10, true, START, END));
        assertThat(filtered.indicators()).isEqualTo(new Indicators(2, 2, 0, 100.0, 1, 3, 2));
        assertThat(filtered.series().interestsByMonth()).containsExactly(new MonthlyInterests("2026-01", 2));
        assertThat(filtered.series().supplyDemandByBreed()).containsExactly(
                new BreedSupplyDemand(1, "Com oferta", "Cao", 2, 2),
                new BreedSupplyDemand(2, "Sem oferta", "Cao", 0, 0));

        DashboardStatisticsResponse empty = dashboard.statistics(new DashboardFilters("Cao", 12, null, START, END));
        assertThat(empty.indicators()).isEqualTo(new Indicators(0, 0, 0, null, 0, 3, 0));
        assertThat(empty.series().animalsByCenter()).isEmpty();
        assertThat(empty.series().supplyDemandByBreed()).containsExactly(
                new BreedSupplyDemand(1, "Com oferta", "Cao", 0, 2),
                new BreedSupplyDemand(2, "Sem oferta", "Cao", 0, 0));
    }

    @Test
    void includesWholeBoundaryDaysAndLeavesStockUnchanged() {
        DashboardStatisticsResponse full = dashboard.statistics(new DashboardFilters(null, null, null, null, null));
        DashboardStatisticsResponse january = dashboard.statistics(new DashboardFilters(null, null, null, START, END));

        assertThat(january.indicators()).isEqualTo(new Indicators(5, 4, 1, 80.0, 2, 3, 4));
        assertThat(january.ageStatistics()).isEqualTo(full.ageStatistics());
        assertThat(january.series()).usingRecursiveComparison().ignoringFields("interestsByMonth")
                .isEqualTo(full.series());
        assertThat(january.series().interestsByMonth()).containsExactly(new MonthlyInterests("2026-01", 4));
        assertThat(dashboard.statistics(new DashboardFilters(null, null, null, START, null)).indicators().totalInterests())
                .isEqualTo(6);
        assertThat(dashboard.statistics(new DashboardFilters(null, null, null, null, END)).indicators().totalInterests())
                .isEqualTo(5);
    }

    private static void insertFixtures(Connection connection) throws SQLException {
        execute(connection, """
                INSERT INTO Conta (idConta, email, senha) VALUES
                (1, 'a@test.local', REPEAT('x', 20)), (2, 'b@test.local', REPEAT('x', 20)),
                (3, 'c@test.local', REPEAT('x', 20)), (4, 'd@test.local', REPEAT('x', 20)),
                (10, 'e@test.local', REPEAT('x', 20)), (11, 'f@test.local', REPEAT('x', 20)),
                (12, 'g@test.local', REPEAT('x', 20))
                """);
        execute(connection, "INSERT INTO Usuario (idConta, nome) VALUES (1, 'A'), (2, 'B'), (3, 'C'), (4, 'D')");
        execute(connection, """
                INSERT INTO Centro_Adocao (idConta, nome) VALUES (10, 'Centro A'), (11, 'Centro B'), (12, 'Centro C')
                """);
        execute(connection, """
                INSERT INTO Raca (idRaca, nome, especie) VALUES
                (1, 'Com oferta', 'Cao'), (2, 'Sem oferta', 'Cao'), (3, 'Com demanda', 'Gato')
                """);
        execute(connection, """
                INSERT INTO Animal (idAnimal, nome, especie, dataNascimento, disponibilidade, idCentro, idRaca) VALUES
                (101, 'A', 'Cao', CURRENT_DATE - INTERVAL 1 YEAR, 1, 10, 1),
                (102, 'B', 'Cao', CURRENT_DATE - INTERVAL 5 YEAR + INTERVAL 7 DAY, 1, 10, 1),
                (103, 'C', 'Cao', CURRENT_DATE - INTERVAL 5 YEAR - INTERVAL 7 DAY, 1, 11, 1),
                (104, 'D', 'Cao', NULL, 0, 10, 1),
                (105, 'E', 'Gato', CURRENT_DATE + INTERVAL 1 DAY, 1, 11, NULL)
                """);
        execute(connection, """
                INSERT INTO Preferencia (idConta, especieDesejada, idRaca) VALUES
                (1, NULL, 1), (2, 'Cao', 1), (3, 'Gato', 3), (4, 'Cao', NULL)
                """);
        execute(connection, """
                INSERT INTO Interesse (idConta, idAnimal, dataInteresse) VALUES
                (1, 101, '2025-12-31 23:59:59'), (2, 101, '2026-01-01 00:00:00'),
                (3, 101, '2026-01-31 23:59:59'), (4, 101, '2026-02-01 00:00:00'),
                (1, 102, '2026-02-01 00:00:00'), (1, 104, '2026-01-31 10:00:00'),
                (1, 105, '2026-01-01 10:00:00')
                """);
    }

    private static void execute(Connection connection, String sql) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.executeUpdate();
        }
    }
}
