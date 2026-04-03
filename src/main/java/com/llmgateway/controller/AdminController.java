package com.llmgateway.controller;

import com.llmgateway.dto.ApiKeyResponse;
import com.llmgateway.dto.CreateModelRequest;
import com.llmgateway.dto.CreatePricingRequest;
import com.llmgateway.dto.CreateProjectRequest;
import com.llmgateway.dto.CreateQuotaRequest;
import com.llmgateway.dto.CreateTenantRequest;
import com.llmgateway.dto.IssueApiKeyRequest;
import com.llmgateway.dto.ModelResponse;
import com.llmgateway.dto.PricingResponse;
import com.llmgateway.dto.ProjectResponse;
import com.llmgateway.dto.QuotaResponse;
import com.llmgateway.dto.TenantResponse;
import com.llmgateway.service.AdminService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @PostMapping("/tenants")
    public ResponseEntity<TenantResponse> createTenant(@RequestBody CreateTenantRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminService.createTenant(request));
    }

    @PostMapping("/projects")
    public ResponseEntity<ProjectResponse> createProject(@RequestBody CreateProjectRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminService.createProject(request));
    }

    @PostMapping("/keys")
    public ResponseEntity<ApiKeyResponse> issueKey(@RequestBody IssueApiKeyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminService.issueApiKey(request));
    }

    @PatchMapping("/keys/{keyId}/revoke")
    public ResponseEntity<ApiKeyResponse> revokeKey(@PathVariable Long keyId) {
        return ResponseEntity.ok(adminService.revokeApiKey(keyId));
    }

    @PostMapping("/models")
    public ResponseEntity<ModelResponse> createModel(@RequestBody CreateModelRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminService.createModel(request));
    }

    @PostMapping("/pricing")
    public ResponseEntity<PricingResponse> createPricing(@RequestBody CreatePricingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminService.createPricing(request));
    }

    @PostMapping("/quotas")
    public ResponseEntity<QuotaResponse> createQuota(@RequestBody CreateQuotaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminService.createQuota(request));
    }
}
