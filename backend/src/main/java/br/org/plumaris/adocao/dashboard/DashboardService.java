package br.org.plumaris.adocao.dashboard;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import br.org.plumaris.adocao.animal.AnimalSpeciesSummary;
import br.org.plumaris.adocao.dashboard.DashboardRepository.AgeBucket;
import br.org.plumaris.adocao.dashboard.DashboardRepository.Snapshot;
import br.org.plumaris.adocao.dashboard.DashboardStatisticsResponse.AgeGroupSummary;
import br.org.plumaris.adocao.dashboard.DashboardStatisticsResponse.Indicators;
import br.org.plumaris.adocao.dashboard.DashboardStatisticsResponse.MonthlyInterests;
import br.org.plumaris.adocao.dashboard.DashboardStatisticsResponse.Series;

@Service
class DashboardService {

    private final DashboardRepository repository;

    DashboardService(DashboardRepository repository) {
        this.repository = repository;
    }

    DashboardStatisticsResponse statistics(DashboardFilters filters) {
        Snapshot snapshot = repository.read(filters);
        AgeDistribution allAges = new AgeDistribution();
        Map<String, AgeDistribution> agesBySpecies = new LinkedHashMap<>();
        Map<String, AnimalSpeciesSummary> totalsBySpecies = new LinkedHashMap<>();
        long total = 0;
        long available = 0;
        long unknownAge = 0;
        long firstAgeGroup = 0;
        long secondAgeGroup = 0;
        long thirdAgeGroup = 0;

        for (AgeBucket bucket : snapshot.ageBuckets()) {
            total += bucket.total();
            available += bucket.available();
            String species = bucket.species();
            totalsBySpecies.merge(species, new AnimalSpeciesSummary(species, bucket.total(), bucket.available(),
                    bucket.total() - bucket.available()), DashboardService::mergeSpeciesTotals);
            AgeDistribution speciesAges = agesBySpecies.computeIfAbsent(species, key -> new AgeDistribution());
            Integer age = bucket.age();
            if (age == null) {
                unknownAge += bucket.total();
            } else {
                allAges.add(age, bucket.total());
                speciesAges.add(age, bucket.total());
                if (age < 2) {
                    firstAgeGroup += bucket.total();
                } else if (age < 5) {
                    secondAgeGroup += bucket.total();
                } else {
                    thirdAgeGroup += bucket.total();
                }
            }
        }

        long totalInterests = snapshot.monthlyInterests().stream().mapToLong(MonthlyInterests::total).sum();
        Indicators indicators = new Indicators(total, available, total - available,
                total == 0 ? null : 100.0 * available / total,
                snapshot.centers().size(), snapshot.globalRegisteredCenters(), totalInterests);
        Series series = new Series(new ArrayList<>(totalsBySpecies.values()), List.of(
                new AgeGroupSummary("0-1", firstAgeGroup), new AgeGroupSummary("2-4", secondAgeGroup),
                new AgeGroupSummary("5+", thirdAgeGroup), new AgeGroupSummary("Unknown", unknownAge)),
                snapshot.centers(), snapshot.breeds(), snapshot.monthlyInterests(),
                agesBySpecies.entrySet().stream().map(entry -> entry.getValue().boxplot(entry.getKey())).toList());
        return new DashboardStatisticsResponse(snapshot.referenceDate(), filters, indicators,
                allAges.statistics(unknownAge), series);
    }

    private static AnimalSpeciesSummary mergeSpeciesTotals(AnimalSpeciesSummary first, AnimalSpeciesSummary second) {
        return new AnimalSpeciesSummary(first.species(), first.total() + second.total(),
                first.available() + second.available(), first.unavailable() + second.unavailable());
    }
}
