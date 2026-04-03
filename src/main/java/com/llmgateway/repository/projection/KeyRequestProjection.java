package com.llmgateway.repository.projection;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface KeyRequestProjection {
    Long getRequestId();

    LocalDateTime getRequestedAt();

    String getStatus();

    Long getModelId();

    Long getProjectId();

    Integer getInputTokens();

    BigDecimal getComputedCost();
}
