package br.org.plumaris.adocao.report;

import java.sql.SQLException;
import java.util.List;

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

import br.org.plumaris.adocao.database.DatabaseConstraintException;
import br.org.plumaris.adocao.database.DatabaseException;

@RestController
@RequestMapping("/api/relatorios")
public class ReportController {

    private final ReportRepository reportRepository;

    public ReportController(ReportRepository reportRepository) {
        this.reportRepository = reportRepository;
    }

    @GetMapping("/centros-sem-animais-disponiveis")
    public List<EmptyCenterResponse> findCentersWithoutAvailableAnimals() {
        return reportRepository.findCentersWithoutAvailableAnimals();
    }

    @GetMapping("/cobertura-racas-animais")
    public List<BreedAnimalCoverageResponse> findBreedAnimalCoverage() {
        return reportRepository.findBreedAnimalCoverage();
    }

    @GetMapping("/preferencias-nao-atendidas")
    public List<UnmetPreferenceResponse> findUnmetPreferences() {
        return reportRepository.findUnmetPreferences();
    }

    @GetMapping("/animais-acima-media-idade")
    public List<OlderAnimalResponse> findOlderThanSpeciesAverage() {
        return reportRepository.findOlderThanSpeciesAverage();
    }

    @GetMapping("/painel-centros")
    public List<CenterOperationsResponse> findCenterOperations() {
        return reportRepository.findCenterOperations();
    }

    @GetMapping("/oferta-demanda-racas")
    public List<BreedSupplyDemandResponse> findBreedSupplyDemand() {
        return reportRepository.findBreedSupplyDemand();
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
