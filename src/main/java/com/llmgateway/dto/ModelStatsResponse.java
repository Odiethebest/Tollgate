package com.llmgateway.dto;

import java.math.BigDecimal;

public record ModelStatsResponse(
        Long modelId,
        String provider,
        String modelName,
        BigDecimal successRate,
        BigDecimal avgLatencyMs,
        Long totalRequests
) {
}
