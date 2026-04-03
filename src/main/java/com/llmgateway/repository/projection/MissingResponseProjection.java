package com.llmgateway.repository.projection;

import java.time.LocalDateTime;

public interface MissingResponseProjection {
    Long getRequestId();

    Long getKeyId();

    Long getModelId();

    Long getProjectId();

    LocalDateTime getRequestedAt();

    String getStatus();
}
