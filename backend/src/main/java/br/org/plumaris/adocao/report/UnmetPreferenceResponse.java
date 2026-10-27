package br.org.plumaris.adocao.report;

public record UnmetPreferenceResponse(
        int userId,
        String userName,
        String email,
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
