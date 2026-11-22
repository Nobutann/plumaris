package br.org.plumaris.adocao.animal;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record AnimalRequest(
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Pattern(regexp = "Cao|Gato") String species,
        @PastOrPresent LocalDate birthDate,
        @Pattern(regexp = "Macho|Femea") String sex,
        @Pattern(regexp = "Pequeno|Medio|Grande") String size,
        @Size(max = 50) String color,
        String description,
        @NotNull Boolean available,
        @NotNull @Positive Integer centerId,
        @Positive Integer breedId,
        @Size(max = 500) String photoUrl
) {

    public String normalizedName() {
        return name.strip();
    }
}
