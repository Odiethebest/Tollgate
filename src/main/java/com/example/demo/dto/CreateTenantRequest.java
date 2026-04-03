package com.example.demo.dto;

public record CreateTenantRequest(
        String name,
        String contactEmail,
        String status
) {
}
