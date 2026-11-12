package br.org.plumaris.adocao.report;

import java.time.LocalDateTime;

public record AnimalAuditLogResponse(
        int logId,
        int animalId,
        String animalName,
        String eventType,
        boolean previousAvailability,
        boolean newAvailability,
        int previousCenterId,
        int newCenterId,
        String details,
        LocalDateTime eventDate
) {
}

