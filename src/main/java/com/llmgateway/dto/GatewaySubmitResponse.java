package com.llmgateway.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record GatewaySubmitResponse(
        Long requestId,
        String status,
        String message,
        BigDecimal computedCost,
        Integer outputTokens,
        Integer latencyMs,
        Integer httpStatus,
        String errorType,
        String deniedReason,
        boolean idempotent,
        LocalDateTime requestedAt
) {
}
