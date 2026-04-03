package com.example.demo.repository.projection;

import java.math.BigDecimal;

public interface QuotaAlertProjection {
    Long getProjectId();

    String getProjectName();

    String getBillingMonth();

    Long getTokensUsed();

    Long getTokenLimit();

    BigDecimal getUsagePct();
}
