package com.example.demo.dto;

public record CreateModelRequest(
        String provider,
        String modelName,
        String version,
        Boolean isActive
) {
}
