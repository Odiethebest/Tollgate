package com.example.demo.dto;

import java.math.BigDecimal;

public record CreateQuotaRequest(
        Long projectId,
        String billingMonth,
        Long tokenLimit,
        BigDecimal costLimit
) {
}
