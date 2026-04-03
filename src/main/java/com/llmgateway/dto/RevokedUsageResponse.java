package com.llmgateway.dto;

import java.time.LocalDateTime;

public record RevokedUsageResponse(
        Long requestId,
        Long keyId,
        LocalDateTime requestedAt,
        LocalDateTime revokedAt,
        Long projectId
) {
}
