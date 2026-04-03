package com.llmgateway.dto;

import java.math.BigDecimal;

public record PricingResponse(
        Long pricingId,
        Long modelId,
        String billingMonth,
        BigDecimal inputRate,
        BigDecimal outputRate
) {
}
