package br.org.plumaris.adocao.animal;

import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class AnimalPhotoControllerTest {

    private static final String ANIMAL_JSON = """
            {"name":"Mel","species":"Gato","available":true,"centerId":1%s}
            """;

    private final AnimalRepository animals = mock(AnimalRepository.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new AnimalController(animals)).build();

    @BeforeEach
    void setUp() {
        when(animals.centerExists(1)).thenReturn(true);
    }

    @Test
    void createsAnimalWithPhoto() throws Exception {
        String photoUrl = "https://example.org/mel.jpg";
        when(animals.create(any(), eq(photoUrl), isNull())).thenReturn(42);
        when(animals.findById(42)).thenReturn(Optional.of(animal(photoUrl)));

        mvc.perform(post("/api/animais").contentType(MediaType.APPLICATION_JSON)
                        .content(ANIMAL_JSON.formatted(",\"photoUrl\":\" " + photoUrl + " \"")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(42))
                .andExpect(jsonPath("$.photoUrl").value(photoUrl));
        verify(animals).create(any(), eq(photoUrl), isNull());
    }

    @Test
    void createsAnimalWhenPhotoIsOmitted() throws Exception {
        when(animals.create(any(), isNull(), isNull())).thenReturn(42);
        when(animals.findById(42)).thenReturn(Optional.of(animal(null)));

        mvc.perform(post("/api/animais").contentType(MediaType.APPLICATION_JSON)
                        .content(ANIMAL_JSON.formatted("")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.photoUrl").value(nullValue()));
    }

    @Test
    void rejectsInvalidPhotoUrlBeforeCreatingAnimal() throws Exception {
        mvc.perform(post("/api/animais").contentType(MediaType.APPLICATION_JSON)
                        .content(ANIMAL_JSON.formatted(",\"photoUrl\":\"file:///tmp/mel.jpg\"")))
                .andExpect(status().isBadRequest());
        verify(animals, never()).create(any(), any(), any());
    }

    private static AnimalResponse animal(String photoUrl) {
        return new AnimalResponse(42, "Mel", "Gato", null, null, null, null, null,
                true, 1, "Centro", null, null, photoUrl);
    }
}
