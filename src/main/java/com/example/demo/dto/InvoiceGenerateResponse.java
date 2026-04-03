package com.example.demo.dto;

import java.util.List;

public record InvoiceGenerateResponse(
        String billingMonth,
        int generatedCount,
        List<InvoiceGenerateItemResponse> invoices
) {
}
