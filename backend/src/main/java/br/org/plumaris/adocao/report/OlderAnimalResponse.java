package br.org.plumaris.adocao.report;

public record OlderAnimalResponse(
        int animalId,
        String animalName,
        String species,
        int ageYears,
        double speciesAverageAge,
        String centerName
) {
}
