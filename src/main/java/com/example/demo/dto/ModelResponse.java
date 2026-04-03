package com.example.demo.dto;

public record ModelResponse(
        Long modelId,
        String provider,
        String modelName,
        String version,
        boolean isActive
) {
}
