package com.llmgateway.controller;

import com.llmgateway.dto.GatewaySubmitRequest;
import com.llmgateway.dto.GatewaySubmitResponse;
import com.llmgateway.service.GatewayService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/gateway")
public class GatewayController {

    private final GatewayService gatewayService;

    public GatewayController(GatewayService gatewayService) {
        this.gatewayService = gatewayService;
    }

    @PostMapping("/submit")
    public ResponseEntity<GatewaySubmitResponse> submit(
            @RequestHeader("X-API-Key") String rawApiKey,
            @RequestBody GatewaySubmitRequest request
    ) {
        GatewayService.GatewayResult result = gatewayService.submitRequest(rawApiKey, request);
        return ResponseEntity.status(result.httpStatus()).body(result.body());
    }
}
