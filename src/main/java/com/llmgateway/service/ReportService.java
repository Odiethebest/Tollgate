package com.llmgateway.service;

import com.llmgateway.dto.ModelStatsResponse;
import com.llmgateway.dto.ProjectCostResponse;
import com.llmgateway.dto.QuotaAlertResponse;
import com.llmgateway.dto.TopProjectCostResponse;
import com.llmgateway.entity.Project;
import com.llmgateway.repository.GatewayRequestRepository;
import com.llmgateway.repository.MonthlyQuotaRepository;
import com.llmgateway.repository.ProjectRepository;
import com.llmgateway.repository.TenantRepository;
import java.time.YearMonth;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ReportService {

    private final GatewayRequestRepository gatewayRequestRepository;
    private final ProjectRepository projectRepository;
    private final TenantRepository tenantRepository;
    private final MonthlyQuotaRepository monthlyQuotaRepository;

    public ReportService(
            GatewayRequestRepository gatewayRequestRepository,
            ProjectRepository projectRepository,
            TenantRepository tenantRepository,
            MonthlyQuotaRepository monthlyQuotaRepository
    ) {
        this.gatewayRequestRepository = gatewayRequestRepository;
        this.projectRepository = projectRepository;
        this.tenantRepository = tenantRepository;
        this.monthlyQuotaRepository = monthlyQuotaRepository;
    }

    public ProjectCostResponse getProjectCost(Long projectId, int days) {
        ValidationUtils.requirePositiveLong(projectId, "projectId");
        if (days <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "days must be positive");
        }

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        var projection = gatewayRequestRepository.getProjectCostAndTokens(projectId, days);
        return new ProjectCostResponse(
                project.getProjectId(),
                project.getName(),
                projection.getTotalCost(),
                projection.getTotalTokens(),
                days
        );
    }

    public List<TopProjectCostResponse> getTopProjects(Long tenantId) {
        ValidationUtils.requirePositiveLong(tenantId, "tenantId");
        if (!tenantRepository.existsById(tenantId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant not found");
        }

        return gatewayRequestRepository.findTopProjectsByTenantForCurrentMonth(tenantId).stream()
                .map(row -> new TopProjectCostResponse(
                        row.getProjectId(),
                        row.getProjectName(),
                        row.getTotalCost()
                ))
                .toList();
    }

    public List<ModelStatsResponse> getModelStats() {
        return gatewayRequestRepository.getModelStats().stream()
                .map(row -> new ModelStatsResponse(
                        row.getModelId(),
                        row.getProvider(),
                        row.getModelName(),
                        row.getSuccessRate(),
                        row.getAvgLatencyMs(),
                        row.getTotalRequests()
                ))
                .toList();
    }

    public List<QuotaAlertResponse> getQuotaAlerts() {
        String currentMonth = YearMonth.now().toString();
        return monthlyQuotaRepository.findQuotaAlerts(currentMonth, 80.0).stream()
                .map(row -> new QuotaAlertResponse(
                        row.getProjectId(),
                        row.getProjectName(),
                        row.getBillingMonth(),
                        row.getTokensUsed(),
                        row.getTokenLimit(),
                        row.getUsagePct()
                ))
                .toList();
    }
}
