package com.llmgateway;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Base class for integration tests that need the real database.
 *
 * <p>The container is a singleton started once per JVM rather than a JUnit {@code @Container},
 * so every test class reuses the same PostgreSQL instance instead of paying container startup
 * per class. Ryuk tears it down when the JVM exits.
 *
 * <p>PostgreSQL specifically, not H2: the behaviour under test is {@code SELECT ... FOR UPDATE}
 * row locking and a losing insert blocking on a unique index. An in-memory database either does
 * not implement those or implements them differently, which would make a green test meaningless.
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "spring.jpa.show-sql=false",
                "logging.level.org.hibernate.engine.jdbc.spi.SqlExceptionHelper=OFF"
        }
)
public abstract class AbstractIntegrationTest {

    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:15");

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }
}
