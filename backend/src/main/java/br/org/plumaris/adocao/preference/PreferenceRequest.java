package br.org.plumaris.adocao.preference;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import tools.jackson.core.JsonParser;
import tools.jackson.core.JsonToken;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.ValueDeserializer;
import tools.jackson.databind.annotation.JsonDeserialize;

public record PreferenceRequest(
        @JsonDeserialize(using = IntegerField.class) @NotNull @Positive Integer userId,
        @Pattern(regexp = "Cao|Gato", message = "Selecione uma espécie válida.") String desiredSpecies,
        @Pattern(regexp = "Pequeno|Medio|Grande", message = "Selecione um porte válido.") String desiredSize,
        @JsonDeserialize(using = IntegerField.class) @PositiveOrZero Integer minimumAge,
        @JsonDeserialize(using = IntegerField.class) @PositiveOrZero Integer maximumAge,
        @Pattern(regexp = "Macho|Femea", message = "Selecione um sexo válido.") String desiredSex,
        @Size(max = 50, message = "A cor deve ter até 50 caracteres.") String desiredColor,
        @JsonDeserialize(using = IntegerField.class) @Positive Integer breedId
) {
    public PreferenceRequest {
        desiredSpecies = normalize(desiredSpecies);
        desiredSize = normalize(desiredSize);
        desiredSex = normalize(desiredSex);
        desiredColor = normalize(desiredColor);
    }

    private static String normalize(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }

    public static class IntegerField extends ValueDeserializer<Integer> {
        @Override
        public Integer deserialize(JsonParser parser, DeserializationContext context) {
            if (parser.hasToken(JsonToken.VALUE_NUMBER_INT)) {
                return parser.getIntValue();
            }
            if (parser.hasToken(JsonToken.VALUE_STRING) && parser.getString().isBlank()) {
                return null;
            }
            return context.reportInputMismatch(Integer.class, "Esperado um número inteiro.");
        }
    }
}
