package com.example.demo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;

@Entity
@Table(
        name = "model_pricing",
        uniqueConstraints = @UniqueConstraint(columnNames = {"model_id", "billing_month"})
)
public class ModelPricing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "pricing_id")
    private Long pricingId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "model_id", nullable = false)
    private LlmModel model;

    @Column(name = "billing_month", nullable = false, length = 7)
    private String billingMonth;

    @Column(name = "input_rate", nullable = false, precision = 10, scale = 6)
    private BigDecimal inputRate;

    @Column(name = "output_rate", nullable = false, precision = 10, scale = 6)
    private BigDecimal outputRate;

    public Long getPricingId() {
        return pricingId;
    }

    public void setPricingId(Long pricingId) {
        this.pricingId = pricingId;
    }

    public LlmModel getModel() {
        return model;
    }

    public void setModel(LlmModel model) {
        this.model = model;
    }

    public String getBillingMonth() {
        return billingMonth;
    }

    public void setBillingMonth(String billingMonth) {
        this.billingMonth = billingMonth;
    }

    public BigDecimal getInputRate() {
        return inputRate;
    }

    public void setInputRate(BigDecimal inputRate) {
        this.inputRate = inputRate;
    }

    public BigDecimal getOutputRate() {
        return outputRate;
    }

    public void setOutputRate(BigDecimal outputRate) {
        this.outputRate = outputRate;
    }
}
