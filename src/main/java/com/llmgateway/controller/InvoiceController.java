package com.llmgateway.controller;

import com.llmgateway.dto.InvoiceGenerateResponse;
import com.llmgateway.dto.InvoiceGenerateItemResponse;
import com.llmgateway.service.InvoiceService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
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

    @GetMapping
    public List<InvoiceGenerateItemResponse> list(@RequestParam("billingMonth") String billingMonth) {
        return invoiceService.listInvoices(billingMonth);
    }

    @PostMapping("/generate")
    public InvoiceGenerateResponse generate(@RequestParam("billingMonth") String billingMonth) {
        return invoiceService.generateInvoices(billingMonth);
    }
}
