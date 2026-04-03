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
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "denied_event")
public class DeniedEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "event_id")
    private Long eventId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "request_id", nullable = false)
    private GatewayRequest request;

    @Column(name = "reason", nullable = false, length = 50)
    private String reason;

    @CreationTimestamp
    @Column(name = "denied_at", nullable = false, updatable = false)
    private LocalDateTime deniedAt;

    @Column(name = "threshold_pct", precision = 5, scale = 2)
    private BigDecimal thresholdPct;

    public Long getEventId() {
        return eventId;
    }

    public void setEventId(Long eventId) {
        this.eventId = eventId;
    }

    public GatewayRequest getRequest() {
        return request;
    }

    public void setRequest(GatewayRequest request) {
        this.request = request;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public LocalDateTime getDeniedAt() {
        return deniedAt;
    }

    public void setDeniedAt(LocalDateTime deniedAt) {
        this.deniedAt = deniedAt;
    }

    public BigDecimal getThresholdPct() {
        return thresholdPct;
    }

    public void setThresholdPct(BigDecimal thresholdPct) {
        this.thresholdPct = thresholdPct;
    }
}
