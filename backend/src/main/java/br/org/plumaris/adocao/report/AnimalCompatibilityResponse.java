package br.org.plumaris.adocao.report;

public record AnimalCompatibilityResponse(
        int animalId,
        String animalName,
        String species,
        String size,
        String sex,
        String color,
        String breedName,
        int compatibilityScore,
        String adoptionPriority
) {
}

