package com.llmgateway.repository.projection;

import java.math.BigDecimal;

public interface InvoiceAggregateProjection {
    BigDecimal getTotalCost();

    Long getTotalTokens();
}
