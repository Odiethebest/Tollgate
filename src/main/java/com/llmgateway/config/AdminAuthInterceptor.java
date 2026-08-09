package com.llmgateway.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Shared-secret gate for the admin surface. The gateway endpoint authenticates callers by API key
 * hash; these routes have no per-caller identity, so they are protected by a single deployment-wide
 * token instead.
 */
class AdminAuthInterceptor implements HandlerInterceptor {

    static final String HEADER = "X-Admin-Token";

    private final byte[] expectedToken;

    AdminAuthInterceptor(String expectedToken) {
        this.expectedToken = expectedToken.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        // Spring keeps registered interceptors on the pre-flight handler chain, so an unauthenticated
        // OPTIONS would fail CORS negotiation before the browser ever sends the real request.
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }

        String presented = request.getHeader(HEADER);
        if (presented == null || !isTokenValid(presented)) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    HEADER + " header is missing or invalid"
            );
        }
        return true;
    }

    private boolean isTokenValid(String presented) {
        // Constant-time comparison so a caller cannot narrow the token down byte by byte.
        return MessageDigest.isEqual(presented.getBytes(StandardCharsets.UTF_8), expectedToken);
    }
}
