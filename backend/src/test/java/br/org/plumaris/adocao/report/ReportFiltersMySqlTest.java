package br.org.plumaris.adocao.report;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import br.org.plumaris.adocao.animal.AnimalAgeGroupSummary;
import br.org.plumaris.adocao.animal.AnimalRepository;
import br.org.plumaris.adocao.animal.AnimalRequest;
import br.org.plumaris.adocao.animal.AnimalResponse;
import br.org.plumaris.adocao.animal.AnimalSpeciesSummary;
import br.org.plumaris.adocao.database.DatabaseConnectionFactory;
import br.org.plumaris.adocao.database.DatabaseException;

@EnabledIfEnvironmentVariable(named = "PLUMARIS_TEST_MYSQL_URL", matches = "jdbc:mysql://[^/?]+/?")
class ReportFiltersMySqlTest {

    private static final String SCHEMA = "report_test_" + UUID.randomUUID().toString().replace("-", "");
    private static DatabaseConnectionFactory admin;
    private static boolean schemaCreated;
    private static AnimalRepository animals;
    private static ReportRepository reports;

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
            runScript(connection, "01_criacao_tabelas.sql");
            runScript(connection, "05_visoes.sql");
            insertFixtures(connection);
        }
        animals = new AnimalRepository(factory);
        reports = new ReportRepository(factory);
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
    void savesAndReplacesAnimalPhotoAndRollsBackWhenPhotoCannotBeSaved() {
        String photoUrl = "https://example.org/mel.jpg";
        AnimalRequest request = new AnimalRequest("Mel com foto", "Gato", null, null, null,
                null, null, true, 10, null, photoUrl);

        int id = animals.create(request, photoUrl);
        try {
            assertThat(animals.findById(id)).get().extracting(AnimalResponse::photoUrl).isEqualTo(photoUrl);
            assertThat(animals.findAll("Gato", 10, true))
                    .extracting(AnimalResponse::id, AnimalResponse::photoUrl)
                    .contains(tuple(id, photoUrl));

            assertThatThrownBy(() -> animals.create(request, "file:///tmp/mel.jpg"))
                    .isInstanceOf(DatabaseException.class);
            assertThat(animals.findAll("Gato", 10, true))
                    .extracting(AnimalResponse::id)
                    .containsExactly(id);

            String replacement = "https://example.org/mel-nova.jpg";
            animals.update(id, request, replacement);
            animals.update(id, request, null);
            assertThat(animals.findById(id)).get().extracting(AnimalResponse::photoUrl).isEqualTo(replacement);
        } finally {
            animals.delete(id);
        }
    }

    @Test
    void preservesUnfilteredResultsAndOrder() {
        assertThat(animals.findAll(null, null, null)).extracting(AnimalResponse::id)
                .containsExactly(101, 102, 103, 104, 105, 106, 107, 108);
        assertThat(animals.summarizeBySpecies(null, null, null)).containsExactly(
                new AnimalSpeciesSummary("Cao", 5, 4, 1), new AnimalSpeciesSummary("Gato", 3, 2, 1));
        assertThat(animals.summarizeByAgeGroup(null, null, null)).containsExactly(
                new AnimalAgeGroupSummary("Cao", "0-1", 1), new AnimalAgeGroupSummary("Cao", "5+", 2),
                new AnimalAgeGroupSummary("Cao", "Unknown", 2), new AnimalAgeGroupSummary("Gato", "Unknown", 3));
        assertThat(reports.findCentersWithoutAvailableAnimals(null, null)).extracting(EmptyCenterResponse::centerId)
                .containsExactly(12, 13, 14);
        assertThat(reports.findBreedAnimalCoverage(null, null))
                .extracting(BreedAnimalCoverageResponse::breedId, BreedAnimalCoverageResponse::animalId)
                .containsExactly(tuple(null, 105), tuple(null, 106), tuple(null, 107),
                        tuple(1, 101), tuple(1, 102), tuple(1, 103), tuple(1, 104),
                        tuple(2, null), tuple(3, null), tuple(4, 108));
        assertThat(reports.findUnmetPreferences(null, null, null)).extracting(UnmetPreferenceResponse::userId)
                .containsExactly(3, 4, 5);
        assertThat(reports.findOlderThanSpeciesAverage(null, null)).extracting(OlderAnimalResponse::animalId)
                .containsExactly(103, 102);
        assertThat(reports.findCenterOperations(null, null, null)).extracting(CenterOperationsResponse::centerId)
                .containsExactly(10, 11, 12, 13, 14);
        assertThat(reports.findBreedSupplyDemand(null, null, null)).extracting(BreedSupplyDemandResponse::breedId)
                .containsExactly(1, 4, 2, 3);
    }

    @Test
    void filtersAnimalsBeforeBothAggregations() {
        assertThat(animals.findAll("Gato", null, null)).extracting(AnimalResponse::id)
                .containsExactly(105, 107, 108);
        assertThat(animals.findAll(null, 10, null)).extracting(AnimalResponse::id).containsExactly(101, 102);
        assertThat(animals.findAll(null, null, false)).extracting(AnimalResponse::id).containsExactly(104, 107);
        assertThat(animals.findAll("Cao", 12, false)).extracting(AnimalResponse::id).containsExactly(104);
        assertThat(animals.findAll("Cao", 12, true)).isEmpty();
        assertThat(animals.summarizeBySpecies("Cao", 10, true))
                .containsExactly(new AnimalSpeciesSummary("Cao", 2, 2, 0));
        assertThat(animals.summarizeBySpecies(null, 12, false)).containsExactly(
                new AnimalSpeciesSummary("Cao", 1, 0, 1), new AnimalSpeciesSummary("Gato", 1, 0, 1));
        assertThat(animals.summarizeByAgeGroup("Cao", 12, false))
                .containsExactly(new AnimalAgeGroupSummary("Cao", "Unknown", 1));
        assertThat(animals.summarizeByAgeGroup("Gato", 11, true))
                .containsExactly(new AnimalAgeGroupSummary("Gato", "Unknown", 2));
    }

    @Test
    void antiJoinKeepsCenterWithOnlyUnavailableAnimalsAndMatchesWholeCity() {
        assertThat(reports.findCentersWithoutAvailableAnimals("São Paulo", "SP"))
                .extracting(EmptyCenterResponse::centerId).containsExactly(12);
        assertThat(reports.findCentersWithoutAvailableAnimals("São", null)).isEmpty();
        assertThat(reports.findCentersWithoutAvailableAnimals(null, "PE"))
                .extracting(EmptyCenterResponse::centerId).containsExactly(13);
    }

    @Test
    void coverageKeepsUnmatchedRowsAndUsesBreedSpeciesWhenPresent() {
        assertThat(reports.findBreedAnimalCoverage("Cao", "Raca sem animal"))
                .extracting(BreedAnimalCoverageResponse::breedId, BreedAnimalCoverageResponse::animalId)
                .containsExactly(tuple(2, null));
        assertThat(reports.findBreedAnimalCoverage("Gato", "Animal sem raca"))
                .extracting(BreedAnimalCoverageResponse::breedId, BreedAnimalCoverageResponse::animalId)
                .containsExactly(tuple(null, 105), tuple(null, 107));
        assertThat(reports.findBreedAnimalCoverage("Cao", "Raca com animal"))
                .extracting(BreedAnimalCoverageResponse::animalId).containsExactly(101, 102, 103, 104, 108);
        assertThat(reports.findBreedAnimalCoverage("Gato", "Raca com animal")).isEmpty();
    }

    @Test
    void filtersPreferencesAndKeepsTheOriginalAvailabilityAndCompatibilityChecks() {
        assertThat(reports.findUnmetPreferences(null, "Gato", null)).extracting(UnmetPreferenceResponse::userId)
                .containsExactly(3, 5);
        assertThat(reports.findUnmetPreferences(null, null, 2)).extracting(UnmetPreferenceResponse::userId)
                .containsExactly(4);
        assertThat(reports.findUnmetPreferences(3, "Gato", 3)).extracting(UnmetPreferenceResponse::userId)
                .containsExactly(3);
        assertThat(reports.findUnmetPreferences(1, "Cao", 1)).isEmpty();
        assertThat(reports.findUnmetPreferences(4, "Cao", 2)).isEmpty();
    }

    @Test
    void centerFilterKeepsTheGlobalSpeciesAverage() {
        List<OlderAnimalResponse> filtered = reports.findOlderThanSpeciesAverage("Cao", 10);
        assertThat(filtered).extracting(OlderAnimalResponse::animalId, OlderAnimalResponse::speciesAverageAge)
                .containsExactly(tuple(102, 4.7));
        assertThat(reports.findOlderThanSpeciesAverage("Cao", 11))
                .containsExactly(reports.findOlderThanSpeciesAverage(null, null).getFirst());
        assertThat(reports.findOlderThanSpeciesAverage("Gato", 11)).isEmpty();
    }

    @Test
    void viewsKeepTheOriginalAggregatesInFilteredRows() {
        CenterOperationsResponse center = reports.findCenterOperations(null, null, null).getFirst();
        assertThat(reports.findCenterOperations(10, "Recife", "PE")).containsExactly(center);
        assertThat(center.totalAnimals()).isEqualTo(2);
        assertThat(center.totalInterests()).isEqualTo(3);
        assertThat(reports.findCenterOperations(null, "São Paulo", "SP")).extracting(CenterOperationsResponse::centerId)
                .containsExactly(11, 12);
        assertThat(reports.findCenterOperations(10, "São Paulo", "PE")).isEmpty();

        BreedSupplyDemandResponse breed = reports.findBreedSupplyDemand(null, null, null).getFirst();
        assertThat(reports.findBreedSupplyDemand("Cao", 1, "Superavit de oferta")).containsExactly(breed);
        assertThat(breed.totalAnimals()).isEqualTo(4);
        assertThat(breed.availableAnimals()).isEqualTo(3);
        assertThat(breed.preferenceCount()).isEqualTo(2);
        assertThat(breed.totalInterests()).isEqualTo(3);
        assertThat(reports.findBreedSupplyDemand(null, null, "Deficit de oferta"))
                .extracting(BreedSupplyDemandResponse::breedId).containsExactly(2, 3);
        assertThat(reports.findBreedSupplyDemand("Cao", 1, "Oferta equilibrada")).isEmpty();
    }

    private static void insertFixtures(Connection connection) throws SQLException {
        execute(connection, """
                INSERT INTO Conta (idConta, email, senha) VALUES
                (1, 'a@test.local', REPEAT('x', 20)), (2, 'b@test.local', REPEAT('x', 20)),
                (3, 'c@test.local', REPEAT('x', 20)), (4, 'd@test.local', REPEAT('x', 20)),
                (5, 'e@test.local', REPEAT('x', 20)), (10, 'f@test.local', REPEAT('x', 20)),
                (11, 'g@test.local', REPEAT('x', 20)), (12, 'h@test.local', REPEAT('x', 20)),
                (13, 'i@test.local', REPEAT('x', 20)), (14, 'j@test.local', REPEAT('x', 20))
                """);
        execute(connection, """
                INSERT INTO Usuario (idConta, nome) VALUES (1, 'A'), (2, 'B'), (3, 'C'), (4, 'D'), (5, 'E')
                """);
        execute(connection, """
                INSERT INTO Centro_Adocao (idConta, nome, cidade, estado) VALUES
                (10, 'Centro A', 'Recife', 'PE'), (11, 'Centro B', 'São   Paulo', 'SP'),
                (12, 'Centro C', '  São Paulo', 'SP'), (13, 'Centro D', 'Olinda', 'PE'),
                (14, 'Centro E', NULL, NULL)
                """);
        execute(connection, """
                INSERT INTO Raca (idRaca, nome, especie) VALUES
                (1, 'Com oferta', 'Cao'), (2, 'Sem animais', 'Cao'), (3, 'Com demanda', 'Gato'),
                (4, 'Outro vínculo', 'Cao')
                """);
        execute(connection, """
                INSERT INTO Animal (idAnimal, nome, especie, dataNascimento, disponibilidade, idCentro, idRaca) VALUES
                (101, 'A', 'Cao', CURRENT_DATE - INTERVAL 1 YEAR, 1, 10, 1),
                (102, 'B', 'Cao', CURRENT_DATE - INTERVAL 5 YEAR - INTERVAL 3 DAY, 1, 10, 1),
                (103, 'C', 'Cao', CURRENT_DATE - INTERVAL 8 YEAR, 1, 11, 1),
                (104, 'D', 'Cao', NULL, 0, 12, 1),
                (105, 'E', 'Gato', CURRENT_DATE + INTERVAL 1 DAY, 1, 11, NULL),
                (106, 'F', 'Cao', NULL, 1, 11, NULL),
                (107, 'G', 'Gato', NULL, 0, 12, NULL),
                (108, 'H', 'Gato', NULL, 1, 11, 4)
                """);
        execute(connection, """
                INSERT INTO Preferencia (idConta, especieDesejada, idRaca, idadeMinima) VALUES
                (1, 'Cao', 1, NULL), (2, 'Cao', 1, NULL), (3, 'Gato', 3, NULL),
                (4, NULL, 2, NULL), (5, 'Gato', NULL, 1)
                """);
        execute(connection, """
                INSERT INTO Interesse (idConta, idAnimal) VALUES (1, 101), (2, 101), (1, 102)
                """);
    }

    private static void runScript(Connection connection, String file) throws Exception {
        String script = Files.readString(Path.of("..", "database", file)).replace("USE adocao_bd;", "");
        for (String sql : script.split(";")) {
            if (!sql.isBlank()) {
                execute(connection, sql);
            }
        }
    }

    private static void execute(Connection connection, String sql) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.executeUpdate();
        }
    }
}
