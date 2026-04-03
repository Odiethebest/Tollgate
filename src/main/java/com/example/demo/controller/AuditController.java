package com.example.demo.controller;

import com.example.demo.dto.KeyRequestAuditResponse;
import com.example.demo.dto.MissingResponseRecord;
import com.example.demo.dto.RevokedUsageResponse;
import com.example.demo.service.AuditService;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/audit")
public class AuditController {

    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping("/keys/{keyId}/requests")
    public List<KeyRequestAuditResponse> getRequestsByKey(
            @PathVariable Long keyId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to
    ) {
        return auditService.getRequestsByKey(keyId, from, to);
    }

    @GetMapping("/revoked-usage")
    public List<RevokedUsageResponse> getRevokedUsage() {
        return auditService.getRevokedUsage();
    }

    @GetMapping("/missing-responses")
    public List<MissingResponseRecord> getMissingResponses() {
        return auditService.getMissingResponses();
    }
}
