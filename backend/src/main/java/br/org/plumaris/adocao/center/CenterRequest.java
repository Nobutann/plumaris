package br.org.plumaris.adocao.center;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CenterRequest(
        @NotBlank(message = "Informe o nome do centro.")
        @Size(max = 150, message = "O nome deve ter até 150 caracteres.") String name,
        @NotBlank(message = "Informe o e-mail da conta.")
        @Size(max = 255, message = "O e-mail deve ter até 255 caracteres.")
        @Email(message = "Informe um e-mail válido.")
        @Pattern(regexp = "[^@]+@[^@]+\\.[^@]+", message = "Informe um e-mail com domínio válido.") String email,
        @JsonProperty(access = JsonProperty.Access.WRITE_ONLY) String password,
        String description,
        @Size(max = 120, message = "A rua deve ter até 120 caracteres.") String street,
        @Size(max = 20, message = "O número deve ter até 20 caracteres.") String number,
        @Size(max = 80, message = "O bairro deve ter até 80 caracteres.") String neighborhood,
        @Size(max = 80, message = "A cidade deve ter até 80 caracteres.") String city,
        @Pattern(regexp = "AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO",
                message = "Informe uma UF brasileira válida.") String state,
        @Pattern(regexp = "[0-9]{8}", message = "O CEP deve ter oito dígitos.") String postalCode) {

    public CenterRequest {
        name = normalize(name);
        email = normalize(email);
        description = normalize(description);
        street = normalize(street);
        number = normalize(number);
        neighborhood = normalize(neighborhood);
        city = normalize(city);
        state = normalize(state);
        if (state != null) {
            state = state.toUpperCase(Locale.ROOT);
        }
        postalCode = normalize(postalCode);
    }

    @AssertTrue(message = "A descrição deve ocupar até 65.535 bytes em UTF-8.")
    public boolean isDescriptionWithinLimit() {
        return description == null || description.getBytes(StandardCharsets.UTF_8).length <= 65_535;
    }

    private static String normalize(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }

    @Override
    public String toString() {
        return "CenterRequest[credentials omitted]";
    }
}
