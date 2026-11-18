package br.org.plumaris.adocao.dashboard;

import java.util.ArrayList;
import java.util.List;
import java.util.NavigableMap;
import java.util.TreeMap;

import br.org.plumaris.adocao.dashboard.DashboardStatisticsResponse.AgeStatistics;
import br.org.plumaris.adocao.dashboard.DashboardStatisticsResponse.SpeciesAgeBoxplot;

final class AgeDistribution {

    private final NavigableMap<Integer, Long> frequencies = new TreeMap<>();
    private long count;

    void add(int age, long frequency) {
        frequencies.merge(age, frequency, Long::sum);
        count += frequency;
    }

    AgeStatistics statistics(long excludedCount) {
        if (count == 0) {
            return new AgeStatistics(0, excludedCount, null, null, List.of(), null, null);
        }

        double sum = 0;
        long maxFrequency = 1;
        List<Integer> modes = new ArrayList<>();
        for (var entry : frequencies.entrySet()) {
            int age = entry.getKey();
            long frequency = entry.getValue();
            sum += (double) age * frequency;
            if (frequency > maxFrequency) {
                modes.clear();
                maxFrequency = frequency;
            }
            if (frequency == maxFrequency && frequency > 1) {
                modes.add(age);
            }
        }

        double mean = sum / count;
        double sumSquaredDifferences = 0;
        for (var entry : frequencies.entrySet()) {
            double difference = entry.getKey() - mean;
            sumSquaredDifferences += difference * difference * entry.getValue();
        }
        double variance = sumSquaredDifferences / count;
        return new AgeStatistics(count, excludedCount, mean, percentile(0.5), modes, variance, Math.sqrt(variance));
    }

    SpeciesAgeBoxplot boxplot(String species) {
        if (count == 0) {
            return new SpeciesAgeBoxplot(species, 0, null, null, null, null, null);
        }
        return new SpeciesAgeBoxplot(species, count, frequencies.firstKey(), percentile(0.25),
                percentile(0.5), percentile(0.75), frequencies.lastKey());
    }

    private double percentile(double probability) {
        double position = (count - 1) * probability;
        long lowerIndex = (long) position;
        int lower = ageAt(lowerIndex);
        double fraction = position - lowerIndex;
        return fraction == 0 ? lower : lower + (ageAt(lowerIndex + 1) - lower) * fraction;
    }

    private int ageAt(long index) {
        for (var entry : frequencies.entrySet()) {
            if (index < entry.getValue()) {
                return entry.getKey();
            }
            index -= entry.getValue();
        }
        throw new IllegalStateException("Age index outside the distribution");
    }
}
