package br.org.plumaris.adocao.report;

import jakarta.validation.constraints.Min;

public record CompleteAdoptionRequest(
        @Min(1) int animalId,
        @Min(1) int userId
) {
}

