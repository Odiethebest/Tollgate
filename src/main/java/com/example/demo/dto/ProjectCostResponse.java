package com.example.demo.dto;

import java.math.BigDecimal;

public record ProjectCostResponse(
        Long projectId,
        String projectName,
        BigDecimal totalCost,
        Long totalTokens,
        int days
) {
}
