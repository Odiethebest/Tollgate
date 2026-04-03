package com.llmgateway.dto;

public record CreateModelRequest(
        String provider,
        String modelName,
        String version,
        Boolean isActive
) {
}
