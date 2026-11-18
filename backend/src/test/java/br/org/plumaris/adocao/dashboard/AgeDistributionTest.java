package br.org.plumaris.adocao.dashboard;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import br.org.plumaris.adocao.dashboard.DashboardStatisticsResponse.AgeStatistics;
import br.org.plumaris.adocao.dashboard.DashboardStatisticsResponse.SpeciesAgeBoxplot;

class AgeDistributionTest {

    @Test
    void emptyDistributionHasNoNumericalMeasures() {
        AgeDistribution ages = distribution();

        assertThat(ages.statistics(2)).isEqualTo(new AgeStatistics(0, 2, null, null, List.of(), null, null));
        assertThat(ages.boxplot("Cao")).isEqualTo(new SpeciesAgeBoxplot("Cao", 0, null, null, null, null, null));
    }

    @Test
    void singleAgeHasNoSpreadOrMode() {
        AgeDistribution ages = distribution(3);

        assertThat(ages.statistics(0)).isEqualTo(new AgeStatistics(1, 0, 3.0, 3.0, List.of(), 0.0, 0.0));
        assertThat(ages.boxplot("Cao")).isEqualTo(new SpeciesAgeBoxplot("Cao", 1, 3, 3.0, 3.0, 3.0, 3));
    }

    @Test
    void oddNumberOfDistinctAgesHasNoMode() {
        AgeDistribution ages = distribution(4, 3, 0, 2, 1);

        assertThat(ages.statistics(0)).isEqualTo(new AgeStatistics(5, 0, 2.0, 2.0, List.of(), 2.0, Math.sqrt(2)));
        assertThat(ages.boxplot("Cao")).isEqualTo(new SpeciesAgeBoxplot("Cao", 5, 0, 1.0, 2.0, 3.0, 4));
    }

    @Test
    void evenDistributionInterpolatesQuartilesAndReportsTiedModes() {
        AgeDistribution ages = distribution(4, 2);
        ages.add(1, 2);
        ages.add(5, 2);

        assertThat(ages.statistics(0).modes()).containsExactly(1, 5);
        assertThat(ages.boxplot("Cao")).isEqualTo(new SpeciesAgeBoxplot("Cao", 6, 1, 1.25, 3.0, 4.75, 5));
    }

    private AgeDistribution distribution(int... values) {
        AgeDistribution ages = new AgeDistribution();
        for (int value : values) {
            ages.add(value, 1);
        }
        return ages;
    }
}
