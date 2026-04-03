package com.llmgateway.dto;

import java.math.BigDecimal;

public record TopProjectCostResponse(
        Long projectId,
        String projectName,
        BigDecimal totalCost
) {
}
