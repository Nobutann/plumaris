package br.org.plumaris.adocao.animal;

import java.time.LocalDate;

public record AnimalResponse(
        int id,
        String name,
        String species,
        LocalDate birthDate,
        String sex,
        String size,
        String color,
        String description,
        boolean available,
        int centerId,
        String centerName,
        Integer breedId,
        String breedName,
        String photoUrl
) {
}
