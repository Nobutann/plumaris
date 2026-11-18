package br.org.plumaris.adocao.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class QueryParameter {

    private QueryParameter() {
    }

    public static String species(String name, String value) {
        return option(name, value, "Cao", "Gato");
    }

    public static String option(String name, String value, String... allowed) {
        if (value != null && !List.of(allowed).contains(value)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    name + " deve ser um destes valores: " + String.join(", ", allowed) + ".");
        }
        return value;
    }

    public static Integer positiveId(String name, String value) {
        if (value == null) {
            return null;
        }
        if (value.matches("[0-9]+")) {
            try {
                int id = Integer.parseInt(value);
                if (id > 0) {
                    return id;
                }
            } catch (NumberFormatException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        name + " excede o limite de um inteiro de 32 bits.");
            }
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, name + " deve ser um inteiro positivo.");
    }
}
