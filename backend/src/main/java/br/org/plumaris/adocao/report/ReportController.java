package br.org.plumaris.adocao.report;

import java.sql.SQLException;
import java.util.List;
import java.util.Locale;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import br.org.plumaris.adocao.database.DatabaseConstraintException;
import br.org.plumaris.adocao.database.DatabaseException;
import br.org.plumaris.adocao.web.QueryParameter;

@RestController
@RequestMapping("/api/relatorios")
public class ReportController {

    private final ReportRepository reportRepository;

    public ReportController(ReportRepository reportRepository) {
        this.reportRepository = reportRepository;
    }

    @GetMapping("/centros-sem-animais-disponiveis")
    public List<EmptyCenterResponse> findCentersWithoutAvailableAnimals(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String state) {
        return reportRepository.findCentersWithoutAvailableAnimals(normalizeCity(city), normalizeState(state));
    }

    @GetMapping("/cobertura-racas-animais")
    public List<BreedAnimalCoverageResponse> findBreedAnimalCoverage(
            @RequestParam(required = false) String species,
            @RequestParam(required = false) String matchStatus) {
        return reportRepository.findBreedAnimalCoverage(QueryParameter.species("species", species),
                QueryParameter.option("matchStatus", matchStatus, "Raca com animal", "Raca sem animal", "Animal sem raca"));
    }

    @GetMapping("/preferencias-nao-atendidas")
    public List<UnmetPreferenceResponse> findUnmetPreferences(
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String desiredSpecies,
            @RequestParam(required = false) String breedId) {
        return reportRepository.findUnmetPreferences(QueryParameter.positiveId("userId", userId),
                QueryParameter.species("desiredSpecies", desiredSpecies), QueryParameter.positiveId("breedId", breedId));
    }

    @GetMapping("/animais-acima-media-idade")
    public List<OlderAnimalResponse> findOlderThanSpeciesAverage(
            @RequestParam(required = false) String species,
            @RequestParam(required = false) String centerId) {
        return reportRepository.findOlderThanSpeciesAverage(QueryParameter.species("species", species),
                QueryParameter.positiveId("centerId", centerId));
    }

    @GetMapping("/painel-centros")
    public List<CenterOperationsResponse> findCenterOperations(
            @RequestParam(required = false) String centerId,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String state) {
        return reportRepository.findCenterOperations(QueryParameter.positiveId("centerId", centerId),
                normalizeCity(city), normalizeState(state));
    }

    @GetMapping("/oferta-demanda-racas")
    public List<BreedSupplyDemandResponse> findBreedSupplyDemand(
            @RequestParam(required = false) String species,
            @RequestParam(required = false) String breedId,
            @RequestParam(required = false) String supplyStatus) {
        return reportRepository.findBreedSupplyDemand(QueryParameter.species("species", species),
                QueryParameter.positiveId("breedId", breedId), QueryParameter.option("supplyStatus", supplyStatus,
                        "Deficit de oferta", "Superavit de oferta", "Oferta equilibrada"));
    }

    @GetMapping("/prioridade-adocao")
    public List<AnimalPriorityResponse> findAnimalPriorities() {
        return reportRepository.findAnimalPriorities();
    }

    @GetMapping("/compatibilidade-usuario")
    public List<AnimalCompatibilityResponse> findCompatibilityForUser(@RequestParam("userId") int userId) {
        return reportRepository.findCompatibilityForUser(userId);
    }

    @PostMapping("/procedimentos/concluir-adocao")
    public AdoptionCompletionResponse completeAdoption(@Valid @RequestBody CompleteAdoptionRequest request) {
        return reportRepository.completeAdoption(request.animalId(), request.userId());
    }

    @PostMapping("/procedimentos/redistribuir-animais")
    public RedistributionResultResponse redistributeAnimals(@Valid @RequestBody RedistributeAnimalsRequest request) {
        return reportRepository.redistributeAnimals(request.sourceCenterId(), request.maxPerUnit());
    }

    @GetMapping("/logs-auditoria")
    public List<AnimalAuditLogResponse> findAuditLogs() {
        return reportRepository.findAuditLogs();
    }

    @PostMapping("/interesses")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void registerInterest(@Valid @RequestBody InterestRequest request) {
        reportRepository.registerInterest(request.userId(), request.animalId());
    }

    @ExceptionHandler(DatabaseConstraintException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ProblemDetail handleConstraintViolation(DatabaseConstraintException exception) {
        String detail = exception.getCause() != null && exception.getCause().getMessage() != null
                ? exception.getCause().getMessage()
                : "Violação de restrição de integridade no banco de dados.";
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, detail);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ProblemDetail> handleResponseStatus(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode()).body(exception.getBody());
    }

    private static String normalizeCity(String value) {
        if (value == null) {
            return null;
        }
        String city = value.replaceAll("(?U)\\s+", " ").strip();
        if (city.isEmpty() || city.codePointCount(0, city.length()) > 80) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "city deve conter de 1 a 80 caracteres.");
        }
        return city;
    }

    private static String normalizeState(String value) {
        return QueryParameter.option("state", value == null ? null : value.strip().toUpperCase(Locale.ROOT),
                "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
                "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO");
    }

    @ExceptionHandler(DatabaseException.class)
    public ResponseEntity<ProblemDetail> handleDatabaseException(DatabaseException exception) {
        Throwable cause = exception.getCause();
        if (cause instanceof SQLException sqlException) {
            ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                    HttpStatus.BAD_REQUEST, sqlException.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
        }
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR, exception.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(problem);
    }
}
