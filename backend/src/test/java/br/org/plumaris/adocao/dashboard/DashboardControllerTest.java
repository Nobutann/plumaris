package br.org.plumaris.adocao.dashboard;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import br.org.plumaris.adocao.dashboard.DashboardRepository.Snapshot;

class DashboardControllerTest {

    private static final String ROUTE = "/api/dashboard/estatisticas";

    private final DashboardRepository repository = mock(DashboardRepository.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(
            new DashboardController(new DashboardService(repository))).build();

    @ParameterizedTest
    @CsvSource({"species, Dog", "species, cao", "species, ''", "centerId, 0", "centerId, -1",
            "centerId, 1.2", "centerId, 2147483648", "available, 1", "available, TRUE",
            "startDate, 2026-1-01", "startDate, 2026-02-29", "endDate, 31/01/2026"})
    void rejectsInvalidFilters(String parameter, String value) throws Exception {
        mvc.perform(get(ROUTE).param(parameter, value))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail", containsString(parameter)));
        verifyNoInteractions(repository);
    }

    @Test
    void rejectsInvertedRange() throws Exception {
        mvc.perform(get(ROUTE).param("startDate", "2026-02-01").param("endDate", "2026-01-31"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail", containsString("startDate")));
        verifyNoInteractions(repository);
    }

    @Test
    void echoesAppliedFiltersAndReturnsCoherentEmptyResult() throws Exception {
        LocalDate referenceDate = LocalDate.of(2026, 11, 18);
        DashboardFilters filters = new DashboardFilters("Gato", 42, false, LocalDate.of(2026, 1, 1), null);
        when(repository.read(filters)).thenReturn(new Snapshot(referenceDate, 3, List.of(), List.of(), List.of(), List.of()));

        mvc.perform(get(ROUTE).param("species", "Gato").param("centerId", "42")
                .param("available", "false").param("startDate", "2026-01-01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.referenceDate").value("2026-11-18"))
                .andExpect(jsonPath("$.filters.species").value("Gato"))
                .andExpect(jsonPath("$.filters.centerId").value(42))
                .andExpect(jsonPath("$.filters.available").value(false))
                .andExpect(jsonPath("$.filters.startDate").value("2026-01-01"))
                .andExpect(jsonPath("$.filters.endDate", nullValue()))
                .andExpect(jsonPath("$.indicators.totalAnimals").value(0))
                .andExpect(jsonPath("$.indicators.availablePercentage", nullValue()))
                .andExpect(jsonPath("$.indicators.globalRegisteredCenters").value(3))
                .andExpect(jsonPath("$.ageStatistics.mean", nullValue()))
                .andExpect(jsonPath("$.ageStatistics.modes").isEmpty())
                .andExpect(jsonPath("$.series.ageGroups.length()").value(4))
                .andExpect(jsonPath("$.series.interestsByMonth").isEmpty());
    }
}
