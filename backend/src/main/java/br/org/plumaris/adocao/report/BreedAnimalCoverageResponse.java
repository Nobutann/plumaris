package br.org.plumaris.adocao.report;

public record BreedAnimalCoverageResponse(
        Integer breedId,
        String breedName,
        String breedSpecies,
        Integer animalId,
        String animalName,
        String animalSpecies,
        String matchStatus
) {
}
