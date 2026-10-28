package br.org.plumaris.adocao.report;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
