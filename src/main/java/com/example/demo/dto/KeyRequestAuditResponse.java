package com.example.demo.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record KeyRequestAuditResponse(
        Long requestId,
        LocalDateTime requestedAt,
        String status,
        Long modelId,
        Long projectId,
        Integer inputTokens,
        BigDecimal computedCost
) {
}
