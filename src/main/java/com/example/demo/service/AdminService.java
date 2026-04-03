package com.example.demo.service;

import com.example.demo.dto.ApiKeyResponse;
import com.example.demo.dto.CreateModelRequest;
import com.example.demo.dto.CreatePricingRequest;
import com.example.demo.dto.CreateProjectRequest;
import com.example.demo.dto.CreateQuotaRequest;
import com.example.demo.dto.CreateTenantRequest;
import com.example.demo.dto.ModelResponse;
import com.example.demo.dto.PricingResponse;
import com.example.demo.dto.ProjectResponse;
import com.example.demo.dto.QuotaResponse;
import com.example.demo.dto.TenantResponse;
import com.example.demo.dto.IssueApiKeyRequest;
import com.example.demo.entity.ApiKey;
import com.example.demo.entity.LlmModel;
import com.example.demo.entity.ModelPricing;
import com.example.demo.entity.MonthlyQuota;
import com.example.demo.entity.Project;
import com.example.demo.entity.Tenant;
import com.example.demo.repository.ApiKeyRepository;
import com.example.demo.repository.LlmModelRepository;
import com.example.demo.repository.ModelPricingRepository;
import com.example.demo.repository.MonthlyQuotaRepository;
import com.example.demo.repository.ProjectRepository;
import com.example.demo.repository.TenantRepository;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AdminService {

    private final TenantRepository tenantRepository;
    private final ProjectRepository projectRepository;
    private final ApiKeyRepository apiKeyRepository;
    private final LlmModelRepository llmModelRepository;
    private final ModelPricingRepository modelPricingRepository;
    private final MonthlyQuotaRepository monthlyQuotaRepository;

    public AdminService(
            TenantRepository tenantRepository,
            ProjectRepository projectRepository,
            ApiKeyRepository apiKeyRepository,
            LlmModelRepository llmModelRepository,
            ModelPricingRepository modelPricingRepository,
            MonthlyQuotaRepository monthlyQuotaRepository
    ) {
        this.tenantRepository = tenantRepository;
        this.projectRepository = projectRepository;
        this.apiKeyRepository = apiKeyRepository;
        this.llmModelRepository = llmModelRepository;
        this.modelPricingRepository = modelPricingRepository;
        this.monthlyQuotaRepository = monthlyQuotaRepository;
    }

    @Transactional
    public TenantResponse createTenant(CreateTenantRequest request) {
        String name = ValidationUtils.requireNonBlank(request.name(), "name");
        String contactEmail = ValidationUtils.requireNonBlank(request.contactEmail(), "contactEmail");
        String status = ValidationUtils.validateTenantStatusOrDefault(request.status());
        if (tenantRepository.existsByName(name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tenant name already exists");
        }

        Tenant tenant = new Tenant();
        tenant.setName(name);
        tenant.setContactEmail(contactEmail);
        tenant.setStatus(status);

        Tenant saved = tenantRepository.save(tenant);
        return toTenantResponse(saved);
    }

    @Transactional
    public ProjectResponse createProject(CreateProjectRequest request) {
        ValidationUtils.requirePositiveLong(request.tenantId(), "tenantId");
        String name = ValidationUtils.requireNonBlank(request.name(), "name");
        String environment = ValidationUtils.validateEnvironment(request.environment());

        Tenant tenant = tenantRepository.findById(request.tenantId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant not found"));

        if (projectRepository.existsByTenantTenantIdAndName(request.tenantId(), name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Project name already exists for tenant");
        }

        Project project = new Project();
        project.setTenant(tenant);
        project.setName(name);
        project.setEnvironment(environment);

        Project saved = projectRepository.save(project);
        return toProjectResponse(saved);
    }

    @Transactional
    public ApiKeyResponse issueApiKey(IssueApiKeyRequest request) {
        ValidationUtils.requirePositiveLong(request.projectId(), "projectId");

        Project project = projectRepository.findById(request.projectId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        String rawKey = UUID.randomUUID().toString();
        String keyHash = HashUtils.sha256Hex(rawKey);

        ApiKey apiKey = new ApiKey();
        apiKey.setProject(project);
        apiKey.setKeyHash(keyHash);
        apiKey.setStatus("active");
        apiKey.setLabel(request.label() == null || request.label().isBlank() ? null : request.label().trim());

        ApiKey saved = apiKeyRepository.save(apiKey);
        return toApiKeyResponse(saved, rawKey);
    }

    @Transactional
    public ApiKeyResponse revokeApiKey(Long keyId) {
        ValidationUtils.requirePositiveLong(keyId, "keyId");
        ApiKey apiKey = apiKeyRepository.findById(keyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "API key not found"));

        if (!"revoked".equals(apiKey.getStatus())) {
            apiKey.setStatus("revoked");
            apiKey.setRevokedAt(LocalDateTime.now());
            apiKey = apiKeyRepository.save(apiKey);
        }

        return toApiKeyResponse(apiKey, null);
    }

    @Transactional
    public ModelResponse createModel(CreateModelRequest request) {
        String provider = ValidationUtils.requireNonBlank(request.provider(), "provider");
        String modelName = ValidationUtils.requireNonBlank(request.modelName(), "modelName");
        String version = ValidationUtils.requireNonBlank(request.version(), "version");

        LlmModel model = new LlmModel();
        model.setProvider(provider);
        model.setModelName(modelName);
        model.setVersion(version);
        model.setActive(request.isActive() == null || request.isActive());

        LlmModel saved = llmModelRepository.save(model);
        return toModelResponse(saved);
    }

    @Transactional
    public PricingResponse createPricing(CreatePricingRequest request) {
        ValidationUtils.requirePositiveLong(request.modelId(), "modelId");
        String billingMonth = ValidationUtils.validateBillingMonth(request.billingMonth());
        if (request.inputRate() == null || request.outputRate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "inputRate and outputRate are required");
        }

        LlmModel model = llmModelRepository.findById(request.modelId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Model not found"));

        ModelPricing pricing = modelPricingRepository
                .findByModelModelIdAndBillingMonth(request.modelId(), billingMonth)
                .orElseGet(ModelPricing::new);
        pricing.setModel(model);
        pricing.setBillingMonth(billingMonth);
        pricing.setInputRate(request.inputRate());
        pricing.setOutputRate(request.outputRate());

        ModelPricing saved = modelPricingRepository.save(pricing);
        return toPricingResponse(saved);
    }

    @Transactional
    public QuotaResponse createQuota(CreateQuotaRequest request) {
        ValidationUtils.requirePositiveLong(request.projectId(), "projectId");
        String billingMonth = ValidationUtils.validateBillingMonth(request.billingMonth());
        ValidationUtils.requirePositiveLong(request.tokenLimit(), "tokenLimit");

        Project project = projectRepository.findById(request.projectId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        MonthlyQuota quota = monthlyQuotaRepository
                .findByProjectProjectIdAndBillingMonth(request.projectId(), billingMonth)
                .orElseGet(MonthlyQuota::new);
        quota.setProject(project);
        quota.setBillingMonth(billingMonth);
        quota.setTokenLimit(request.tokenLimit());
        if (quota.getTokensUsed() == null) {
            quota.setTokensUsed(0L);
        }
        quota.setCostLimit(request.costLimit());

        MonthlyQuota saved = monthlyQuotaRepository.save(quota);
        return toQuotaResponse(saved);
    }

    private TenantResponse toTenantResponse(Tenant tenant) {
        return new TenantResponse(
                tenant.getTenantId(),
                tenant.getName(),
                tenant.getContactEmail(),
                tenant.getStatus(),
                tenant.getCreatedAt()
        );
    }

    private ProjectResponse toProjectResponse(Project project) {
        return new ProjectResponse(
                project.getProjectId(),
                project.getTenant().getTenantId(),
                project.getName(),
                project.getEnvironment(),
                project.getCreatedAt()
        );
    }

    private ApiKeyResponse toApiKeyResponse(ApiKey apiKey, String rawKey) {
        return new ApiKeyResponse(
                apiKey.getKeyId(),
                apiKey.getProject().getProjectId(),
                apiKey.getLabel(),
                apiKey.getStatus(),
                apiKey.getKeyHash(),
                rawKey,
                apiKey.getCreatedAt(),
                apiKey.getRevokedAt()
        );
    }

    private ModelResponse toModelResponse(LlmModel model) {
        return new ModelResponse(
                model.getModelId(),
                model.getProvider(),
                model.getModelName(),
                model.getVersion(),
                model.isActive()
        );
    }

    private PricingResponse toPricingResponse(ModelPricing pricing) {
        return new PricingResponse(
                pricing.getPricingId(),
                pricing.getModel().getModelId(),
                pricing.getBillingMonth(),
                pricing.getInputRate(),
                pricing.getOutputRate()
        );
    }

    private QuotaResponse toQuotaResponse(MonthlyQuota quota) {
        return new QuotaResponse(
                quota.getQuotaId(),
                quota.getProject().getProjectId(),
                quota.getBillingMonth(),
                quota.getTokenLimit(),
                quota.getTokensUsed(),
                quota.getCostLimit()
        );
    }
}
