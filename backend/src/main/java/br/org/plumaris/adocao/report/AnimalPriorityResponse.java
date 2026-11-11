package br.org.plumaris.adocao.report;

import java.time.LocalDate;

public record AnimalPriorityResponse(
        int animalId,
        String animalName,
        String species,
        String size,
        LocalDate birthDate,
        boolean available,
        long totalInterests,
        String adoptionPriority
) {
}

