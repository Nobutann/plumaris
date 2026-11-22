package br.org.plumaris.adocao.animal;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.Locale;

import javax.imageio.ImageIO;
import javax.imageio.stream.MemoryCacheImageInputStream;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public record AnimalPhoto(byte[] content, String contentType) {

    static AnimalPhoto decode(String encoded) {
        try {
            byte[] content = Base64.getDecoder().decode(encoded);
            try (var input = new MemoryCacheImageInputStream(new ByteArrayInputStream(content))) {
                var readers = ImageIO.getImageReaders(input);
                if (readers.hasNext()) {
                    var reader = readers.next();
                    try {
                        reader.setInput(input);
                        var format = reader.getFormatName().toLowerCase(Locale.ROOT);
                        if (("jpeg".equals(format) || "png".equals(format))
                                && reader.getWidth(0) > 0 && reader.getHeight(0) > 0) {
                            return new AnimalPhoto(content, "image/" + format);
                        }
                    } finally {
                        reader.dispose();
                    }
                }
            }
        } catch (IllegalArgumentException | IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecione uma foto JPEG ou PNG válida.", exception);
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecione uma foto JPEG ou PNG válida.");
    }
}
