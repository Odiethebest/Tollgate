package com.llmgateway.dto;

public record GatewaySubmitRequest(
        Long modelId,
        Integer inputTokens,
        String idempotencyKey,
        String prompt
) {
}
