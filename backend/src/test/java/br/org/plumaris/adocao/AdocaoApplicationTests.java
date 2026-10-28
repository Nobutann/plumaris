package br.org.plumaris.adocao;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = "database.password=test-only")
class AdocaoApplicationTests {

	@Test
	void contextLoads() {
	}

}
