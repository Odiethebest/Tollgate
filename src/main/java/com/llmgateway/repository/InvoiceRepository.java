package com.llmgateway.repository;

import com.llmgateway.entity.Invoice;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    Optional<Invoice> findByProjectProjectIdAndBillingMonth(Long projectId, String billingMonth);
}
