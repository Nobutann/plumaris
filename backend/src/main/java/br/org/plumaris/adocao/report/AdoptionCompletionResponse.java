package br.org.plumaris.adocao.report;

public record AdoptionCompletionResponse(
        int animalId,
        String animalName,
        String species,
        boolean available,
        int centerId,
        String description
) {
}

