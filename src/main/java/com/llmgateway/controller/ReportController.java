package com.llmgateway.controller;

import com.llmgateway.dto.ModelStatsResponse;
import com.llmgateway.dto.ProjectCostResponse;
import com.llmgateway.dto.QuotaAlertResponse;
import com.llmgateway.dto.TopProjectCostResponse;
import com.llmgateway.service.ReportService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/projects/{projectId}/cost")
    public ProjectCostResponse getProjectCost(
            @PathVariable Long projectId,
            @RequestParam(defaultValue = "30") int days
    ) {
        return reportService.getProjectCost(projectId, days);
    }

    @GetMapping("/tenants/{tenantId}/top-projects")
    public List<TopProjectCostResponse> getTopProjects(@PathVariable Long tenantId) {
        return reportService.getTopProjects(tenantId);
    }

    @GetMapping("/models/stats")
    public List<ModelStatsResponse> getModelStats() {
        return reportService.getModelStats();
    }

    @GetMapping("/quota-alerts")
    public List<QuotaAlertResponse> getQuotaAlerts() {
        return reportService.getQuotaAlerts();
    }
}
