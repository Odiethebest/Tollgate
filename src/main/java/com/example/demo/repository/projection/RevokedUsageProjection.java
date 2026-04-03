package com.example.demo.repository.projection;

import java.time.LocalDateTime;

public interface RevokedUsageProjection {
    Long getRequestId();

    Long getKeyId();

    LocalDateTime getRequestedAt();

    LocalDateTime getRevokedAt();

    Long getProjectId();
}
