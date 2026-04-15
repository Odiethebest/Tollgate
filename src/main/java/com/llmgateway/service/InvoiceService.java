package com.llmgateway.service;

import com.llmgateway.dto.InvoiceGenerateItemResponse;
import com.llmgateway.dto.InvoiceGenerateResponse;
import com.llmgateway.entity.Invoice;
import com.llmgateway.entity.Project;
import com.llmgateway.repository.GatewayRequestRepository;
import com.llmgateway.repository.InvoiceRepository;
import com.llmgateway.repository.ProjectRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InvoiceService {

    private final ProjectRepository projectRepository;
    private final GatewayRequestRepository gatewayRequestRepository;
    private final InvoiceRepository invoiceRepository;

    public InvoiceService(
            ProjectRepository projectRepository,
            GatewayRequestRepository gatewayRequestRepository,
            InvoiceRepository invoiceRepository
    ) {
        this.projectRepository = projectRepository;
        this.gatewayRequestRepository = gatewayRequestRepository;
        this.invoiceRepository = invoiceRepository;
    }

    @Transactional
    public InvoiceGenerateResponse generateInvoices(String billingMonthInput) {
        String billingMonth = ValidationUtils.validateBillingMonth(billingMonthInput);
        List<Project> projects = projectRepository.findAll();
        List<InvoiceGenerateItemResponse> results = new ArrayList<>();

        for (Project project : projects) {
            var aggregate = gatewayRequestRepository.getInvoiceAggregate(project.getProjectId(), billingMonth);
            BigDecimal totalCost = aggregate == null ? BigDecimal.ZERO : aggregate.getTotalCost();
            Long totalTokens = aggregate == null ? 0L : aggregate.getTotalTokens();

            Invoice invoice = invoiceRepository
                    .findByProjectProjectIdAndBillingMonth(project.getProjectId(), billingMonth)
                    .orElseGet(Invoice::new);
            invoice.setProject(project);
            invoice.setBillingMonth(billingMonth);
            invoice.setTotalCost(totalCost == null ? BigDecimal.ZERO : totalCost);
            invoice.setTotalTokens(totalTokens == null ? 0L : totalTokens);
            if (invoice.getInvoiceId() == null) {
                invoice.setPaid(false);
            }

            Invoice saved = invoiceRepository.save(invoice);
            results.add(new InvoiceGenerateItemResponse(
                    saved.getInvoiceId(),
                    project.getProjectId(),
                    project.getName(),
                    saved.getBillingMonth(),
                    saved.getTotalCost(),
                    saved.getTotalTokens(),
                    saved.isPaid(),
                    saved.getIssuedAt()
            ));
        }

        return new InvoiceGenerateResponse(billingMonth, results.size(), results);
    }

    @Transactional(readOnly = true)
    public List<InvoiceGenerateItemResponse> listInvoices(String billingMonthInput) {
        String billingMonth = ValidationUtils.validateBillingMonth(billingMonthInput);
        return invoiceRepository.findByBillingMonthOrderByProjectProjectIdAsc(billingMonth).stream()
                .map(this::toInvoiceItemResponse)
                .toList();
    }

    private InvoiceGenerateItemResponse toInvoiceItemResponse(Invoice invoice) {
        return new InvoiceGenerateItemResponse(
                invoice.getInvoiceId(),
                invoice.getProject().getProjectId(),
                invoice.getProject().getName(),
                invoice.getBillingMonth(),
                invoice.getTotalCost(),
                invoice.getTotalTokens(),
                invoice.isPaid(),
                invoice.getIssuedAt()
        );
    }
}
