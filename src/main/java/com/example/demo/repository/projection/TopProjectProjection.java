package com.example.demo.repository.projection;

import java.math.BigDecimal;

public interface TopProjectProjection {
    Long getProjectId();

    String getProjectName();

    BigDecimal getTotalCost();
}
