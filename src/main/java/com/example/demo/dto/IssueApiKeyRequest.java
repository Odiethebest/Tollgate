package com.example.demo.dto;

public record IssueApiKeyRequest(
        Long projectId,
        String label
) {
}
