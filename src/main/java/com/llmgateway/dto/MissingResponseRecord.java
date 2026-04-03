package com.llmgateway.dto;

import java.time.LocalDateTime;

public record MissingResponseRecord(
        Long requestId,
        Long keyId,
        Long modelId,
        Long projectId,
        LocalDateTime requestedAt,
        String status
) {
}
