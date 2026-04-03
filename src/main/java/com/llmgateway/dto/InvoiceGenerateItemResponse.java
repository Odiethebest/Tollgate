package com.llmgateway.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record InvoiceGenerateItemResponse(
        Long invoiceId,
        Long projectId,
        String projectName,
        String billingMonth,
        BigDecimal totalCost,
        Long totalTokens,
        boolean paid,
        LocalDateTime issuedAt
) {
}
