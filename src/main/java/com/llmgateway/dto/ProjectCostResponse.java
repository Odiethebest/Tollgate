package com.llmgateway.dto;

import java.math.BigDecimal;

public record ProjectCostResponse(
        Long projectId,
        String projectName,
        BigDecimal totalCost,
        Long totalTokens,
        int days
) {
}
