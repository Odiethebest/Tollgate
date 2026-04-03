package com.example.demo.dto;

import java.math.BigDecimal;

public record TopProjectCostResponse(
        Long projectId,
        String projectName,
        BigDecimal totalCost
) {
}
