package br.org.plumaris.adocao.report;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import br.org.plumaris.adocao.animal.AnimalController;
import br.org.plumaris.adocao.animal.AnimalRepository;

class ReportFiltersControllerTest {

    private final AnimalRepository animals = mock(AnimalRepository.class);
    private final ReportRepository reports = mock(ReportRepository.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(
            new AnimalController(animals), new ReportController(reports)).build();

    @ParameterizedTest
    @CsvSource({
            "/animais, species, Dog",
            "/animais, species, ''",
            "/animais/resumo-por-especie, centerId, 0",
            "/animais/faixas-etarias, centerId, 2147483648",
            "/animais/faixas-etarias, available, 1",
            "/animais, available, TRUE",
            "/relatorios/centros-sem-animais-disponiveis, city, '   '",
            "/relatorios/painel-centros, state, XX",
            "/relatorios/cobertura-racas-animais, matchStatus, 'Sem vínculo'",
            "/relatorios/preferencias-nao-atendidas, userId, -1",
            "/relatorios/preferencias-nao-atendidas, desiredSpecies, cao",
            "/relatorios/preferencias-nao-atendidas, breedId, 1.5",
            "/relatorios/animais-acima-media-idade, centerId, ''",
            "/relatorios/oferta-demanda-racas, supplyStatus, Deficit"
    })
    void rejectsInvalidFilters(String route, String parameter, String value) throws Exception {
        mvc.perform(get("/api" + route).param(parameter, value))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail", containsString(parameter)));
        verifyNoInteractions(animals, reports);
    }

    @Test
    void preservesFalseAndReturnsEmptyArrayForAValidFilter() throws Exception {
        when(animals.findAll("Cao", 42, false)).thenReturn(List.of());

        mvc.perform(get("/api/animais").param("species", "Cao").param("centerId", "42").param("available", "false"))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));
        verify(animals).findAll("Cao", 42, false);
    }

    @Test
    void normalizesCityAndStateBeforeQuerying() throws Exception {
        when(reports.findCenterOperations(12, "São Paulo", "SP")).thenReturn(List.of());

        mvc.perform(get("/api/relatorios/painel-centros").param("centerId", "12")
                        .param("city", "  São \t Paulo  ").param("state", " sp "))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));
        verify(reports).findCenterOperations(12, "São Paulo", "SP");
    }

    @Test
    void forwardsAbsentFiltersAndPreservesRecommendations() throws Exception {
        mvc.perform(get("/api/animais")).andExpect(status().isOk());
        mvc.perform(get("/api/relatorios/cobertura-racas-animais")).andExpect(status().isOk());
        mvc.perform(get("/api/animais/recomendados").param("userId", "42")).andExpect(status().isOk());
        verify(animals).findAll(null, null, null);
        verify(reports).findBreedAnimalCoverage(null, null);
        verify(animals).findRecommendedForUser(42);
    }
}
