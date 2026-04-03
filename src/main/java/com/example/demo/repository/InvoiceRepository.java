package com.example.demo.repository;

import com.example.demo.entity.Invoice;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    Optional<Invoice> findByProjectProjectIdAndBillingMonth(Long projectId, String billingMonth);
}
