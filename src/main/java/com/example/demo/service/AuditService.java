package com.example.demo.service;

import com.example.demo.dto.KeyRequestAuditResponse;
import com.example.demo.dto.MissingResponseRecord;
import com.example.demo.dto.RevokedUsageResponse;
import com.example.demo.repository.ApiKeyRepository;
import com.example.demo.repository.GatewayRequestRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuditService {

    private final ApiKeyRepository apiKeyRepository;
    private final GatewayRequestRepository gatewayRequestRepository;

    public AuditService(ApiKeyRepository apiKeyRepository, GatewayRequestRepository gatewayRequestRepository) {
        this.apiKeyRepository = apiKeyRepository;
        this.gatewayRequestRepository = gatewayRequestRepository;
    }

    public List<KeyRequestAuditResponse> getRequestsByKey(Long keyId, LocalDateTime from, LocalDateTime to) {
        ValidationUtils.requirePositiveLong(keyId, "keyId");
        if (!apiKeyRepository.existsById(keyId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "API key not found");
        }
        if (from != null && to != null && from.isAfter(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "from must be before to");
        }

        return gatewayRequestRepository.findRequestsByKeyAndRange(keyId, from, to).stream()
                .map(row -> new KeyRequestAuditResponse(
                        row.getRequestId(),
                        row.getRequestedAt(),
                        row.getStatus(),
                        row.getModelId(),
                        row.getProjectId(),
                        row.getInputTokens(),
                        row.getComputedCost()
                ))
                .toList();
    }

    public List<RevokedUsageResponse> getRevokedUsage() {
        return gatewayRequestRepository.findRevokedKeyUsage().stream()
                .map(row -> new RevokedUsageResponse(
                        row.getRequestId(),
                        row.getKeyId(),
                        row.getRequestedAt(),
                        row.getRevokedAt(),
                        row.getProjectId()
                ))
                .toList();
    }

    public List<MissingResponseRecord> getMissingResponses() {
        return gatewayRequestRepository.findRequestsWithoutResponses().stream()
                .map(row -> new MissingResponseRecord(
                        row.getRequestId(),
                        row.getKeyId(),
                        row.getModelId(),
                        row.getProjectId(),
                        row.getRequestedAt(),
                        row.getStatus()
                ))
                .toList();
    }
}
