package com.llmgateway.repository.projection;

import java.math.BigDecimal;

public interface ModelStatsProjection {
    Long getModelId();

    String getProvider();

    String getModelName();

    BigDecimal getSuccessRate();

    BigDecimal getAvgLatencyMs();

    Long getTotalRequests();
}
