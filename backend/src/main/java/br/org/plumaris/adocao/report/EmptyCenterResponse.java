package br.org.plumaris.adocao.report;

public record EmptyCenterResponse(
        int centerId,
        String centerName,
        String city,
        String state
) {
}
