package com.llmgateway.controller;

import com.llmgateway.dto.InvoiceGenerateResponse;
import com.llmgateway.service.InvoiceService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    private final InvoiceService invoiceService;

    public InvoiceController(InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
    }

    @PostMapping("/generate")
    public InvoiceGenerateResponse generate(@RequestParam("billingMonth") String billingMonth) {
        return invoiceService.generateInvoices(billingMonth);
    }
}
