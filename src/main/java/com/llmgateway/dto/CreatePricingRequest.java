package com.llmgateway.dto;

import java.math.BigDecimal;

public record CreatePricingRequest(
        Long modelId,
        String billingMonth,
        BigDecimal inputRate,
        BigDecimal outputRate
) {
}
