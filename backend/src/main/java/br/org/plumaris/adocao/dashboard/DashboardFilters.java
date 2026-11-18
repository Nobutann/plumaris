package br.org.plumaris.adocao.dashboard;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public record DashboardFilters(String species, Integer centerId, Boolean available,
        LocalDate startDate, LocalDate endDate) {

    static DashboardFilters parse(String species, String centerId, String available,
            String startDate, String endDate) {
        if (species != null && !species.equals("Cao") && !species.equals("Gato")) {
            throw badRequest("species deve ser Cao ou Gato.");
        }
        if (available != null && !available.equals("true") && !available.equals("false")) {
            throw badRequest("available deve ser true ou false.");
        }
        Integer center = parseCenterId(centerId);
        LocalDate start = parseDate("startDate", startDate);
        LocalDate end = parseDate("endDate", endDate);
        if (start != null && end != null && start.isAfter(end)) {
            throw badRequest("startDate deve ser anterior ou igual a endDate.");
        }
        return new DashboardFilters(species, center, available == null ? null : Boolean.valueOf(available),
                start, end);
    }

    private static Integer parseCenterId(String value) {
        if (value == null) {
            return null;
        }
        try {
            if (value.matches("[0-9]+")) {
                int id = Integer.parseInt(value);
                if (id > 0) {
                    return id;
                }
            }
        } catch (NumberFormatException exception) {
            throw badRequest("centerId excede o limite de um inteiro de 32 bits.");
        }
        throw badRequest("centerId deve ser um inteiro positivo.");
    }

    private static LocalDate parseDate(String parameter, String value) {
        if (value == null) {
            return null;
        }
        try {
            if (value.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")) {
                LocalDate date = LocalDate.parse(value);
                if (date.getYear() > 0) {
                    return date;
                }
            }
        } catch (DateTimeParseException exception) {
            throw badRequest(parameter + " deve ser uma data válida no formato YYYY-MM-DD.");
        }
        throw badRequest(parameter + " deve ser uma data válida no formato YYYY-MM-DD.");
    }

    private static ResponseStatusException badRequest(String detail) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, detail);
    }
}
