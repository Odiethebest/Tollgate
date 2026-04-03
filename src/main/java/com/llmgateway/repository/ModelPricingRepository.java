package com.llmgateway.repository;

import com.llmgateway.entity.ModelPricing;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ModelPricingRepository extends JpaRepository<ModelPricing, Long> {
    Optional<ModelPricing> findByModelModelIdAndBillingMonth(Long modelId, String billingMonth);
}
