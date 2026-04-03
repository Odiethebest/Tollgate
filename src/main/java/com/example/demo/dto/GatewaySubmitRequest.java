package com.example.demo.dto;

public record GatewaySubmitRequest(
        Long modelId,
        Integer inputTokens,
        String idempotencyKey,
        String prompt
) {
}
