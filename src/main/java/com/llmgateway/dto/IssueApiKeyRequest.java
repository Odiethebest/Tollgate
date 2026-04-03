package com.llmgateway.dto;

public record IssueApiKeyRequest(
        Long projectId,
        String label
) {
}
