package br.org.plumaris.adocao.preference;

public record PreferenceResponse(
        int id,
        int userId,
        String userName,
        String desiredSpecies,
        String desiredSize,
        Integer minimumAge,
        Integer maximumAge,
        String desiredSex,
        String desiredColor,
        Integer breedId,
        String breedName
) {
}
