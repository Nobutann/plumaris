package br.org.plumaris.adocao.report;

public record RedistributionResultResponse(
        int sourceCenterId,
        int mainCenterId,
        int maxPerUnit,
        int transferredAnimals,
        int remainingAtSource
) {
}

