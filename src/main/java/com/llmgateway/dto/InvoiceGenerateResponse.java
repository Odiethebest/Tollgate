package com.llmgateway.dto;

import java.util.List;

public record InvoiceGenerateResponse(
        String billingMonth,
        int generatedCount,
        List<InvoiceGenerateItemResponse> invoices
) {
}
