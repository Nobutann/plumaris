package br.org.plumaris.adocao.animal;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;

import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import br.org.plumaris.adocao.database.DatabaseConstraintException;
import br.org.plumaris.adocao.web.QueryParameter;

@RestController
@RequestMapping("/api/animais")
public class AnimalController {

    private final AnimalRepository animalRepository;

    public AnimalController(AnimalRepository animalRepository) {
        this.animalRepository = animalRepository;
    }

    @GetMapping
    public List<AnimalResponse> findAll(
            @RequestParam(required = false) String species,
            @RequestParam(required = false) String centerId,
            @RequestParam(required = false) String available) {
        return animalRepository.findAll(QueryParameter.species("species", species),
                QueryParameter.positiveId("centerId", centerId), parseAvailability(available));
    }

    @GetMapping("/{id}")
    public AnimalResponse findById(@PathVariable int id) {
        return animalRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Animal not found"));
    }

    @GetMapping("/{id}/foto")
    public ResponseEntity<byte[]> findPhoto(@PathVariable int id) {
        AnimalPhoto photo = animalRepository.findUploadedPhoto(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Foto não encontrada"));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(photo.contentType()))
                .cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .body(photo.content());
    }

    @GetMapping("/resumo-por-especie")
    public List<AnimalSpeciesSummary> summarizeBySpecies(
            @RequestParam(required = false) String species,
            @RequestParam(required = false) String centerId,
            @RequestParam(required = false) String available) {
        return animalRepository.summarizeBySpecies(QueryParameter.species("species", species),
                QueryParameter.positiveId("centerId", centerId), parseAvailability(available));
    }

    @GetMapping("/faixas-etarias")
    public List<AnimalAgeGroupSummary> summarizeByAgeGroup(
            @RequestParam(required = false) String species,
            @RequestParam(required = false) String centerId,
            @RequestParam(required = false) String available) {
        return animalRepository.summarizeByAgeGroup(QueryParameter.species("species", species),
                QueryParameter.positiveId("centerId", centerId), parseAvailability(available));
    }

    @GetMapping("/recomendados")
    public List<AnimalResponse> findRecommended(@RequestParam("userId") int userId) {
        return animalRepository.findRecommendedForUser(userId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AnimalResponse create(@Valid @RequestBody AnimalRequest request) {
        validateReferences(request);
        int id = animalRepository.create(request, validatePhotoUrl(request.photoUrl()), readPhoto(request));
        return animalRepository.findById(id)
                .orElseThrow(() -> new IllegalStateException("Created animal not found"));
    }

    @PutMapping("/{id}")
    public AnimalResponse update(@PathVariable int id, @Valid @RequestBody AnimalRequest request) {
        findById(id);
        validateReferences(request);
        animalRepository.update(id, request, validatePhotoUrl(request.photoUrl()), readPhoto(request));
        return findById(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable int id) {
        if (!animalRepository.delete(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Animal not found");
        }
    }

    @ExceptionHandler(DatabaseConstraintException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ProblemDetail handleDataIntegrityViolation() {
        return ProblemDetail.forStatusAndDetail(
                HttpStatus.CONFLICT, "Animal could not be saved because of a database constraint");
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ProblemDetail> handleResponseStatus(ResponseStatusException exception) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                exception.getStatusCode(), exception.getReason());
        return ResponseEntity.status(exception.getStatusCode()).body(problem);
    }

    private static Boolean parseAvailability(String value) {
        return value == null ? null : Boolean.valueOf(QueryParameter.option("available", value, "true", "false"));
    }

    private static AnimalPhoto readPhoto(AnimalRequest request) {
        if (request.photoData() == null) {
            return null;
        }
        if (request.photoUrl() != null && !request.photoUrl().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Escolha um arquivo ou informe uma URL.");
        }
        return AnimalPhoto.decode(request.photoData());
    }

    private static String validatePhotoUrl(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        String url = value.strip();
        try {
            URI uri = new URI(url);
            if (uri.getHost() != null && uri.getRawUserInfo() == null
                    && ("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))) {
                return url;
            }
        } catch (URISyntaxException ignored) {
            // Return the same validation error for malformed and unsupported URLs.
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe uma URL de foto válida (http ou https).");
    }

    private void validateReferences(AnimalRequest request) {
        if (!animalRepository.centerExists(request.centerId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Centro de adoção não encontrado");
        }

        if (request.breedId() != null) {
            String breedSpecies = animalRepository.findBreedSpecies(request.breedId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Raça não encontrada"));

            if (!breedSpecies.equals(request.species())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A raça selecionada não corresponde à espécie do animal");
            }
        }
    }
}
