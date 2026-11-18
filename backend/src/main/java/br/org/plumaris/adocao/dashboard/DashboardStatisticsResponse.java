package br.org.plumaris.adocao.dashboard;

import java.time.LocalDate;
import java.util.List;

import br.org.plumaris.adocao.animal.AnimalSpeciesSummary;

public record DashboardStatisticsResponse(
        LocalDate referenceDate,
        DashboardFilters filters,
        Indicators indicators,
        AgeStatistics ageStatistics,
        Series series
) {
    public record Indicators(long totalAnimals, long availableAnimals, long unavailableAnimals,
            Double availablePercentage, long centersWithAnimals, long globalRegisteredCenters, long totalInterests) {
    }

    public record AgeStatistics(long validAgeCount, long excludedAgeCount, Double mean, Double median,
            List<Integer> modes, Double populationVariance, Double populationStandardDeviation) {
    }

    public record Series(List<AnimalSpeciesSummary> animalsBySpecies, List<AgeGroupSummary> ageGroups,
            List<CenterSummary> animalsByCenter, List<BreedSupplyDemand> supplyDemandByBreed,
            List<MonthlyInterests> interestsByMonth, List<SpeciesAgeBoxplot> ageBoxplotBySpecies) {
    }

    public record AgeGroupSummary(String ageGroup, long total) {
    }

    public record CenterSummary(int centerId, String centerName, long total, long available, long unavailable) {
    }

    public record BreedSupplyDemand(int breedId, String breedName, String species,
            long availableSupply, long globalExplicitBreedPreferences) {
    }

    public record MonthlyInterests(String month, long total) {
    }

    public record SpeciesAgeBoxplot(String species, long count, Integer minimum, Double firstQuartile,
            Double median, Double thirdQuartile, Integer maximum) {
    }
}
