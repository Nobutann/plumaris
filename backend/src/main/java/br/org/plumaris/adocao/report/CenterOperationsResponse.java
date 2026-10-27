package br.org.plumaris.adocao.report;

import java.time.LocalDateTime;

public record CenterOperationsResponse(
        int centerId,
        String centerName,
        String city,
        String state,
        Integer mainCenterId,
        String mainCenterName,
        long totalAnimals,
        long availableAnimals,
        long unavailableAnimals,
        long totalInterests,
        LocalDateTime lastInterest
) {
}
