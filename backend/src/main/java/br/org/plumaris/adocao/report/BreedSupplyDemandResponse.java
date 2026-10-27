package br.org.plumaris.adocao.report;

public record BreedSupplyDemandResponse(
        int breedId,
        String breedName,
        String species,
        long preferenceCount,
        long totalAnimals,
        long availableAnimals,
        long unavailableAnimals,
        long interestedUsers,
        long totalInterests,
        long supplyBalance,
        String supplyStatus
) {
}
