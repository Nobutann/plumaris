package br.org.plumaris.adocao.report;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Repository;

import br.org.plumaris.adocao.database.DatabaseConnectionFactory;
import br.org.plumaris.adocao.database.DatabaseException;

@Repository
public class ReportRepository {

    private static final String EMPTY_CENTERS_SQL = """
            SELECT
                c.idConta AS idCentro,
                c.nome AS centroNome,
                c.cidade,
                c.estado
            FROM Centro_Adocao c
            LEFT JOIN Animal a
                ON a.idCentro = c.idConta
                AND a.disponibilidade = 1
            WHERE a.idAnimal IS NULL
            ORDER BY c.nome, c.idConta
            """;

    private static final String BREED_ANIMAL_COVERAGE_SQL = """
            SELECT
                r.idRaca,
                r.nome AS racaNome,
                r.especie AS racaEspecie,
                a.idAnimal,
                a.nome AS animalNome,
                a.especie AS animalEspecie,
                CASE
                    WHEN a.idAnimal IS NULL THEN 'Raca sem animal'
                    ELSE 'Raca com animal'
                END AS situacaoVinculo
            FROM Raca r
            LEFT JOIN Animal a ON a.idRaca = r.idRaca

            UNION ALL

            SELECT
                r.idRaca,
                r.nome AS racaNome,
                r.especie AS racaEspecie,
                a.idAnimal,
                a.nome AS animalNome,
                a.especie AS animalEspecie,
                'Animal sem raca' AS situacaoVinculo
            FROM Animal a
            LEFT JOIN Raca r ON r.idRaca = a.idRaca
            WHERE r.idRaca IS NULL
            ORDER BY idRaca, idAnimal
            """;

    private static final String UNMET_PREFERENCES_SQL = """
            SELECT
                u.idConta AS idUsuario,
                u.nome AS usuarioNome,
                c.email,
                p.especieDesejada,
                p.porteDesejado,
                p.idadeMinima,
                p.idadeMaxima,
                p.sexoDesejado,
                p.corDesejada,
                p.idRaca,
                r.nome AS racaDesejadaNome
            FROM Usuario u
            JOIN Conta c ON c.idConta = u.idConta
            JOIN Preferencia p ON p.idConta = u.idConta
            LEFT JOIN Raca r ON r.idRaca = p.idRaca
            WHERE NOT EXISTS (
                SELECT 1
                FROM Animal a
                WHERE a.disponibilidade = 1
                    AND (p.especieDesejada IS NULL OR a.especie = p.especieDesejada)
                    AND (p.porteDesejado IS NULL OR a.porte = p.porteDesejado)
                    AND (p.sexoDesejado IS NULL OR a.sexo = p.sexoDesejado)
                    AND (p.corDesejada IS NULL OR a.cor = p.corDesejada)
                    AND (p.idRaca IS NULL OR a.idRaca = p.idRaca)
                    AND (p.idadeMinima IS NULL OR (
                        a.dataNascimento IS NOT NULL
                        AND a.dataNascimento <= CURDATE()
                        AND TIMESTAMPDIFF(YEAR, a.dataNascimento, CURDATE()) >= p.idadeMinima
                    ))
                    AND (p.idadeMaxima IS NULL OR (
                        a.dataNascimento IS NOT NULL
                        AND a.dataNascimento <= CURDATE()
                        AND TIMESTAMPDIFF(YEAR, a.dataNascimento, CURDATE()) <= p.idadeMaxima
                    ))
            )
            ORDER BY u.nome, u.idConta
            """;

    private static final String OLDER_ANIMALS_SQL = """
            SELECT
                a.idAnimal,
                a.nome AS animalNome,
                a.especie,
                TIMESTAMPDIFF(YEAR, a.dataNascimento, CURDATE()) AS idadeAnos,
                ROUND((
                    SELECT AVG(TIMESTAMPDIFF(DAY, a2.dataNascimento, CURDATE())) / 365.2425
                    FROM Animal a2
                    WHERE a2.disponibilidade = 1
                        AND a2.especie = a.especie
                        AND a2.dataNascimento IS NOT NULL
                        AND a2.dataNascimento <= CURDATE()
                ), 1) AS mediaIdadeEspecie,
                c.nome AS centroNome
            FROM Animal a
            JOIN Centro_Adocao c ON c.idConta = a.idCentro
            WHERE a.disponibilidade = 1
                AND a.dataNascimento IS NOT NULL
                AND a.dataNascimento <= CURDATE()
                AND TIMESTAMPDIFF(DAY, a.dataNascimento, CURDATE()) > (
                    SELECT AVG(TIMESTAMPDIFF(DAY, a2.dataNascimento, CURDATE()))
                    FROM Animal a2
                    WHERE a2.disponibilidade = 1
                        AND a2.especie = a.especie
                        AND a2.dataNascimento IS NOT NULL
                        AND a2.dataNascimento <= CURDATE()
                )
            ORDER BY a.especie, a.dataNascimento, a.idAnimal
            """;

    private static final String CENTER_OPERATIONS_SQL = """
            SELECT *
            FROM vw_painel_operacional_centros
            ORDER BY centroNome, idCentro
            """;

    private static final String BREED_SUPPLY_DEMAND_SQL = """
            SELECT *
            FROM vw_oferta_demanda_por_raca
            ORDER BY especie, racaNome, idRaca
            """;

    private final DatabaseConnectionFactory connectionFactory;

    public ReportRepository(DatabaseConnectionFactory connectionFactory) {
        this.connectionFactory = connectionFactory;
    }

    public List<EmptyCenterResponse> findCentersWithoutAvailableAnimals() {
        return query(EMPTY_CENTERS_SQL, results -> new EmptyCenterResponse(
                results.getInt("idCentro"),
                results.getString("centroNome"),
                results.getString("cidade"),
                results.getString("estado")));
    }

    public List<BreedAnimalCoverageResponse> findBreedAnimalCoverage() {
        return query(BREED_ANIMAL_COVERAGE_SQL, results -> new BreedAnimalCoverageResponse(
                results.getObject("idRaca", Integer.class),
                results.getString("racaNome"),
                results.getString("racaEspecie"),
                results.getObject("idAnimal", Integer.class),
                results.getString("animalNome"),
                results.getString("animalEspecie"),
                results.getString("situacaoVinculo")));
    }

    public List<UnmetPreferenceResponse> findUnmetPreferences() {
        return query(UNMET_PREFERENCES_SQL, results -> new UnmetPreferenceResponse(
                results.getInt("idUsuario"),
                results.getString("usuarioNome"),
                results.getString("email"),
                results.getString("especieDesejada"),
                results.getString("porteDesejado"),
                results.getObject("idadeMinima", Integer.class),
                results.getObject("idadeMaxima", Integer.class),
                results.getString("sexoDesejado"),
                results.getString("corDesejada"),
                results.getObject("idRaca", Integer.class),
                results.getString("racaDesejadaNome")));
    }

    public List<OlderAnimalResponse> findOlderThanSpeciesAverage() {
        return query(OLDER_ANIMALS_SQL, results -> new OlderAnimalResponse(
                results.getInt("idAnimal"),
                results.getString("animalNome"),
                results.getString("especie"),
                results.getInt("idadeAnos"),
                results.getDouble("mediaIdadeEspecie"),
                results.getString("centroNome")));
    }

    public List<CenterOperationsResponse> findCenterOperations() {
        return query(CENTER_OPERATIONS_SQL, results -> {
            Timestamp lastInterest = results.getTimestamp("ultimoInteresse");
            return new CenterOperationsResponse(
                    results.getInt("idCentro"),
                    results.getString("centroNome"),
                    results.getString("cidade"),
                    results.getString("estado"),
                    results.getObject("idCentroPrincipal", Integer.class),
                    results.getString("centroPrincipalNome"),
                    results.getLong("totalAnimais"),
                    results.getLong("animaisDisponiveis"),
                    results.getLong("animaisIndisponiveis"),
                    results.getLong("totalInteresses"),
                    lastInterest == null ? null : lastInterest.toLocalDateTime());
        });
    }

    public List<BreedSupplyDemandResponse> findBreedSupplyDemand() {
        return query(BREED_SUPPLY_DEMAND_SQL, results -> new BreedSupplyDemandResponse(
                results.getInt("idRaca"),
                results.getString("racaNome"),
                results.getString("especie"),
                results.getLong("totalPreferencias"),
                results.getLong("totalAnimais"),
                results.getLong("animaisDisponiveis"),
                results.getLong("animaisIndisponiveis"),
                results.getLong("usuariosInteressados"),
                results.getLong("totalInteresses"),
                results.getLong("saldoOferta"),
                results.getString("situacaoOferta")));
    }

    private <T> List<T> query(String sql, RowMapper<T> mapper) {
        List<T> rows = new ArrayList<>();
        try (Connection connection = connectionFactory.openConnection();
                PreparedStatement statement = connection.prepareStatement(sql);
                ResultSet results = statement.executeQuery()) {
            while (results.next()) {
                rows.add(mapper.map(results));
            }
            return rows;
        } catch (SQLException exception) {
            throw DatabaseException.from(exception);
        }
    }

    @FunctionalInterface
    private interface RowMapper<T> {
        T map(ResultSet results) throws SQLException;
    }
}
