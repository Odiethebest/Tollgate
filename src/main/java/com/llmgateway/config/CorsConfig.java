package com.llmgateway.config;

import java.util.Arrays;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private static final Logger logger = LoggerFactory.getLogger(CorsConfig.class);
    private static final String ALLOW_ALL = "*";

    private final List<String> allowedOrigins;

    public CorsConfig(@Value("${CORS_ALLOWED_ORIGINS:*}") String configuredOrigins) {
        this.allowedOrigins = parseOrigins(configuredOrigins);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        if (allowedOrigins.contains(ALLOW_ALL)) {
            logger.warn("CORS_ALLOWED_ORIGINS is not set - /api/** accepts any origin. "
                    + "Set it to a comma-separated origin list before exposing this deployment.");
        } else {
            logger.info("CORS restricted to {}", allowedOrigins);
        }

        registry.addMapping("/api/**")
                .allowedOriginPatterns(allowedOrigins.toArray(String[]::new))
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(false)
                .maxAge(3600);
    }

    private static List<String> parseOrigins(String configuredOrigins) {
        if (configuredOrigins == null || configuredOrigins.isBlank()) {
            return List.of(ALLOW_ALL);
        }
        List<String> parsed = Arrays.stream(configuredOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList();
        return parsed.isEmpty() ? List.of(ALLOW_ALL) : parsed;
    }
}
