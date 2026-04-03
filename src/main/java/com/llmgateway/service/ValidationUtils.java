package com.llmgateway.service;

import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.Set;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

public final class ValidationUtils {

    private static final Set<String> ENVIRONMENTS = Set.of("dev", "staging", "prod");
    private static final Set<String> TENANT_STATUS = Set.of("active", "suspended");

    private ValidationUtils() {
    }

    public static String requireNonBlank(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " is required");
        }
        return value.trim();
    }

    public static void requirePositive(Integer value, String fieldName) {
        if (value == null || value <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " must be positive");
        }
    }

    public static void requirePositiveLong(Long value, String fieldName) {
        if (value == null || value <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " must be positive");
        }
    }

    public static String validateEnvironment(String environment) {
        String normalized = requireNonBlank(environment, "environment");
        if (!ENVIRONMENTS.contains(normalized)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "environment must be one of dev/staging/prod"
            );
        }
        return normalized;
    }

    public static String validateTenantStatusOrDefault(String status) {
        if (status == null || status.isBlank()) {
            return "active";
        }
        String normalized = status.trim();
        if (!TENANT_STATUS.contains(normalized)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "status must be one of active/suspended"
            );
        }
        return normalized;
    }

    public static String validateBillingMonth(String billingMonth) {
        String normalized = requireNonBlank(billingMonth, "billingMonth");
        try {
            YearMonth.parse(normalized);
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "billingMonth must be formatted as YYYY-MM"
            );
        }
        return normalized;
    }
}
