package com.llmgateway.dto;

public record ModelResponse(
        Long modelId,
        String provider,
        String modelName,
        String version,
        boolean isActive
) {
}
