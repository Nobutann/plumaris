package br.org.plumaris.adocao.report;

import jakarta.validation.constraints.Min;

public record InterestRequest(
        @Min(1) int userId,
        @Min(1) int animalId
) {
}

