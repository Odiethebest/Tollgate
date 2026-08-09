package com.llmgateway.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class AdminSecurityConfig implements WebMvcConfigurer {

    private static final Logger logger = LoggerFactory.getLogger(AdminSecurityConfig.class);

    /**
     * Every route that creates, mutates or discloses tenant configuration — including the read
     * endpoints, since {@code GET /api/keys} returns stored key hashes. {@code /api/gateway/submit}
     * is excluded because it authenticates with {@code X-API-Key}, and the report and audit routes
     * stay open so the dashboard renders without credentials.
     */
    private static final String[] PROTECTED_PATTERNS = {
            "/api/tenants", "/api/tenants/**",
            "/api/projects", "/api/projects/**",
            "/api/keys", "/api/keys/**",
            "/api/models", "/api/models/**",
            "/api/pricing", "/api/pricing/**",
            "/api/quotas", "/api/quotas/**",
            "/api/invoices/generate"
    };

    private final String adminToken;

    public AdminSecurityConfig(@Value("${ADMIN_API_TOKEN:}") String adminToken) {
        this.adminToken = adminToken == null ? "" : adminToken.trim();
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        if (adminToken.isEmpty()) {
            logger.warn("ADMIN_API_TOKEN is not set - the admin API is unauthenticated. "
                    + "Set it before exposing this deployment.");
            return;
        }

        registry.addInterceptor(new AdminAuthInterceptor(adminToken))
                .addPathPatterns(PROTECTED_PATTERNS);
        logger.info("Admin API requires the {} header", AdminAuthInterceptor.HEADER);
    }
}
