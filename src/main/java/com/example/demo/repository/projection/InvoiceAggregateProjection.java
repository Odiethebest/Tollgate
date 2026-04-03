package com.example.demo.repository.projection;

import java.math.BigDecimal;

public interface InvoiceAggregateProjection {
    BigDecimal getTotalCost();

    Long getTotalTokens();
}
