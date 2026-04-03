package com.example.demo.dto;

import java.math.BigDecimal;

public record CreatePricingRequest(
        Long modelId,
        String billingMonth,
        BigDecimal inputRate,
        BigDecimal outputRate
) {
}
