package br.org.plumaris.adocao.center;

import java.util.List;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
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
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import br.org.plumaris.adocao.database.DatabaseException;

@RestController
@RequestMapping("/api/centros")
public class CenterController {

    private final CenterRepository centerRepository;

    public CenterController(CenterRepository centerRepository) {
        this.centerRepository = centerRepository;
    }

    @GetMapping
    public List<CenterResponse> findAll() {
        return centerRepository.findAll();
    }

    @GetMapping("/{id}")
    public CenterResponse findById(@PathVariable int id) {
        return centerRepository.findById(id).orElseThrow(this::notFound);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CenterResponse create(@Valid @RequestBody CenterRequest request) {
        String password = request.password();
        if (password == null || password.isBlank() || password.length() < 8 || password.length() > 128) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe uma senha de 8 a 128 caracteres.");
        }
        return centerRepository.create(request, CenterPasswordHash.hash(password));
    }

    @PutMapping("/{id}")
    public CenterResponse update(@PathVariable int id, @Valid @RequestBody CenterRequest request) {
        if (request.password() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Não é possível alterar a senha nesta operação.");
        }
        return centerRepository.update(id, request).orElseThrow(this::notFound);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable int id) {
        if (!centerRepository.delete(id)) {
            throw notFound();
        }
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ProblemDetail handleStatus(ResponseStatusException exception) {
        return exception.getBody();
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getAllErrors().getFirst().getDefaultMessage();
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, message);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ProblemDetail handleInvalidBody() {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Envie os dados do centro em JSON válido.");
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ProblemDetail handleInvalidId() {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Informe um identificador numérico para o centro.");
    }

    @ExceptionHandler(DatabaseException.class)
    public ProblemDetail handleDatabaseError(DatabaseException exception) {
        return switch (((java.sql.SQLException) exception.getCause()).getErrorCode()) {
            case 1062 -> ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Este e-mail já está em uso.");
            case 1451 -> ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,
                    "Não é possível excluir o centro enquanto houver animais ou vínculos com outros centros.");
            default -> ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Não foi possível concluir a operação com o centro.");
        };
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Centro de adoção não encontrado.");
    }
}
