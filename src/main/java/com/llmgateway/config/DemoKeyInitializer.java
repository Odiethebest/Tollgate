package com.llmgateway.config;

import com.llmgateway.dto.ApiKeyResponse;
import com.llmgateway.entity.ApiKey;
import com.llmgateway.entity.Project;
import com.llmgateway.repository.ApiKeyRepository;
import com.llmgateway.repository.ProjectRepository;
import com.llmgateway.service.AdminService;
import com.llmgateway.service.HashUtils;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

@Component
public class DemoKeyInitializer implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(DemoKeyInitializer.class);
    private static final String ACTIVE_STATUS = "active";
    private static final String DEMO_KEY_LABEL = "demo-key";
    private static final String DEFAULT_DEMO_API_KEY = "demo-1234-5678";
    private static final String DEFAULT_PROJECT_NAME = "TechCorp-Dev";

    private final AdminService adminService;
    private final ApiKeyRepository apiKeyRepository;
    private final ProjectRepository projectRepository;
    private final String configuredDemoApiKey;
    private final String configuredProjectName;

    public DemoKeyInitializer(
            AdminService adminService,
            ApiKeyRepository apiKeyRepository,
            ProjectRepository projectRepository,
            @Value("${DEMO_API_KEY:demo-1234-5678}") String configuredDemoApiKey,
            @Value("${DEMO_API_KEY_PROJECT_NAME:TechCorp-Dev}") String configuredProjectName
    ) {
        this.adminService = adminService;
        this.apiKeyRepository = apiKeyRepository;
        this.projectRepository = projectRepository;
        this.configuredDemoApiKey = configuredDemoApiKey;
        this.configuredProjectName = configuredProjectName;
    }

    @Override
    public void run(ApplicationArguments args) {
        String rawKey = normalize(configuredDemoApiKey, DEFAULT_DEMO_API_KEY);
        String desiredProjectName = normalize(configuredProjectName, DEFAULT_PROJECT_NAME);
        String desiredHash = HashUtils.sha256Hex(rawKey);

        List<ApiKey> activeDemoKeys = apiKeyRepository
                .findByLabelAndStatusOrderByCreatedAtAsc(DEMO_KEY_LABEL, ACTIVE_STATUS);

        boolean hasMatchingActiveKey = false;
        for (ApiKey activeDemoKey : activeDemoKeys) {
            if (desiredHash.equals(activeDemoKey.getKeyHash())) {
                hasMatchingActiveKey = true;
                continue;
            }
            adminService.revokeApiKey(activeDemoKey.getKeyId());
        }

        if (hasMatchingActiveKey) {
            logger.info("Demo API key ready. label={}, rawKey={}, projectName={}",
                    DEMO_KEY_LABEL, rawKey, desiredProjectName);
            return;
        }

        Optional<Project> demoProject = resolveProject(desiredProjectName);
        if (demoProject.isEmpty()) {
            logger.warn("Demo API key initialization skipped because no project is available");
            return;
        }

        ApiKeyResponse demoKey = adminService.issueApiKey(
                demoProject.get().getProjectId(),
                DEMO_KEY_LABEL,
                rawKey
        );
        logger.info("Demo API key ready. label={}, rawKey={}, projectName={}, keyId={}",
                DEMO_KEY_LABEL, demoKey.rawKey(), demoProject.get().getName(), demoKey.keyId());
    }

    private Optional<Project> resolveProject(String desiredProjectName) {
        Optional<Project> configuredProject = projectRepository.findFirstByNameOrderByProjectIdAsc(desiredProjectName);
        if (configuredProject.isPresent()) {
            return configuredProject;
        }

        List<Project> fallbackProjects = projectRepository.findAll(Sort.by(Sort.Direction.ASC, "projectId"));
        if (fallbackProjects.isEmpty()) {
            logger.warn("Demo project '{}' was not found and there are no fallback projects", desiredProjectName);
            return Optional.empty();
        }

        Project fallbackProject = fallbackProjects.get(0);
        logger.warn("Demo project '{}' was not found. Falling back to project '{}'",
                desiredProjectName, fallbackProject.getName());
        return Optional.of(fallbackProject);
    }

    private String normalize(String configuredValue, String defaultValue) {
        if (configuredValue == null || configuredValue.isBlank()) {
            return defaultValue;
        }
        return configuredValue.trim();
    }
}
