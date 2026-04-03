package com.example.demo.dto;

import java.math.BigDecimal;

public record QuotaAlertResponse(
        Long projectId,
        String projectName,
        String billingMonth,
        Long tokensUsed,
        Long tokenLimit,
        BigDecimal usagePct
) {
}
