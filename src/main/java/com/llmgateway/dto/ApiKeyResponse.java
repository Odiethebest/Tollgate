package com.llmgateway.dto;

import java.time.LocalDateTime;

public record ApiKeyResponse(
        Long keyId,
        Long projectId,
        String label,
        String status,
        String keyHash,
        String rawKey,
        LocalDateTime createdAt,
        LocalDateTime revokedAt
) {
}
