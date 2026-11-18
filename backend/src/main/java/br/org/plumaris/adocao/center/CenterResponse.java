package br.org.plumaris.adocao.center;

public record CenterResponse(int id, String name, String email, String description,
        String street, String number, String neighborhood, String city, String state, String postalCode) {
}
