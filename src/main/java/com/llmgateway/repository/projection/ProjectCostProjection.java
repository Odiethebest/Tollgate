package com.llmgateway.repository.projection;

import java.math.BigDecimal;

public interface ProjectCostProjection {
    BigDecimal getTotalCost();

    Long getTotalTokens();
}
