package br.org.plumaris.adocao.preference;

import java.sql.SQLException;
import java.util.List;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import br.org.plumaris.adocao.database.DatabaseException;

@RestController
@RequestMapping("/api/preferencias")
public class PreferenceController {

    private final PreferenceRepository preferenceRepository;

    public PreferenceController(PreferenceRepository preferenceRepository) {
        this.preferenceRepository = preferenceRepository;
    }

    @GetMapping
    public List<PreferenceResponse> findAll() {
        return preferenceRepository.findAll();
    }

    @GetMapping("/{id}")
    public PreferenceResponse findById(@PathVariable int id) {
        return preferenceRepository.findById(id).orElseThrow(PreferenceController::notFound);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PreferenceResponse create(@Valid @RequestBody PreferenceRequest request) {
        validateAgeRange(request);
        return preferenceRepository.create(request);
    }

    @PutMapping("/{id}")
    public PreferenceResponse update(@PathVariable int id, @Valid @RequestBody PreferenceRequest request) {
        validateAgeRange(request);
        return preferenceRepository.update(id, request).orElseThrow(PreferenceController::notFound);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable int id) {
        if (!preferenceRepository.delete(id)) {
            throw notFound();
        }
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ProblemDetail handleResponseStatus(ResponseStatusException exception) {
        return ProblemDetail.forStatusAndDetail(exception.getStatusCode(), exception.getReason());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleInvalidFields(MethodArgumentNotValidException exception) {
        String detail = exception.getFieldErrors().stream()
                .map(error -> switch (error.getField()) {
                    case "minimumAge", "maximumAge" -> "As idades devem ser inteiras, entre 0 e 2147483647.";
                    case "userId" -> "Selecione um usuário válido.";
                    case "breedId" -> "Selecione uma raça válida.";
                    default -> error.getDefaultMessage();
                })
                .distinct()
                .reduce((first, next) -> first + " " + next)
                .orElse("Confira os dados da preferência.");
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, detail);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ProblemDetail handleInvalidBody() {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Confira o formato dos dados da preferência. Informe idades e identificadores como números inteiros.");
    }

    @ExceptionHandler(DatabaseException.class)
    public ResponseEntity<ProblemDetail> handleDatabaseError(DatabaseException exception) {
        int code = ((SQLException) exception.getCause()).getErrorCode();
        ProblemDetail problem = switch (code) {
            case 1062 -> ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Este usuário já possui uma preferência.");
            case 1452 -> ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "O usuário ou a raça informada não existe.");
            case 3819, 1406 -> ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Os critérios informados violam os limites da preferência.");
            default -> throw exception;
        };
        return ResponseEntity.status(problem.getStatus()).body(problem);
    }

    private static void validateAgeRange(PreferenceRequest request) {
        if (request.minimumAge() != null && request.maximumAge() != null
                && request.minimumAge() > request.maximumAge()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A idade mínima não pode superar a máxima.");
        }
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Preferência não encontrada.");
    }
}
