package br.org.plumaris.adocao.center;

import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

final class CenterPasswordHash {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int ITERATIONS = 600_000;

    private CenterPasswordHash() {
    }

    static String hash(String password) {
        byte[] salt = new byte[16];
        RANDOM.nextBytes(salt);
        char[] characters = password.toCharArray();
        PBEKeySpec spec = new PBEKeySpec(characters, salt, ITERATIONS, 256);
        Arrays.fill(characters, '\0');
        try {
            byte[] hash = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
            Base64.Encoder encoder = Base64.getEncoder();
            return "pbkdf2-sha256$" + ITERATIONS + "$" + encoder.encodeToString(salt) + "$" + encoder.encodeToString(hash);
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Não foi possível proteger a senha.", exception);
        } finally {
            spec.clearPassword();
        }
    }
}
