package com.llmgateway.dto;

import java.math.BigDecimal;

public record QuotaResponse(
        Long quotaId,
        Long projectId,
        String billingMonth,
        Long tokenLimit,
        Long tokensUsed,
        BigDecimal costLimit
) {
}
