package br.org.plumaris.adocao.report;

import jakarta.validation.constraints.Min;

public record RedistributeAnimalsRequest(
        @Min(1) int sourceCenterId,
        @Min(1) int maxPerUnit
) {
}

