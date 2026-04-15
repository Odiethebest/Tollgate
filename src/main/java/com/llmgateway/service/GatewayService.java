package com.llmgateway.service;

import com.llmgateway.dto.GatewaySubmitRequest;
import com.llmgateway.dto.GatewaySubmitResponse;
import com.llmgateway.entity.ApiKey;
import com.llmgateway.entity.AuditLog;
import com.llmgateway.entity.DeniedEvent;
import com.llmgateway.entity.GatewayRequest;
import com.llmgateway.entity.GatewayResponse;
import com.llmgateway.entity.LlmModel;
import com.llmgateway.entity.ModelPricing;
import com.llmgateway.entity.MonthlyQuota;
import com.llmgateway.repository.ApiKeyRepository;
import com.llmgateway.repository.AuditLogRepository;
import com.llmgateway.repository.DeniedEventRepository;
import com.llmgateway.repository.GatewayRequestRepository;
import com.llmgateway.repository.GatewayResponseRepository;
import com.llmgateway.repository.LlmModelRepository;
import com.llmgateway.repository.ModelPricingRepository;
import com.llmgateway.repository.MonthlyQuotaRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class GatewayService {

    private static final String STATUS_SUCCESS = "success";
    private static final String STATUS_DENIED = "denied";
    private static final String STATUS_FAILED = "failed";
    private static final String REASON_KEY_REVOKED = "KEY_REVOKED";
    private static final String REASON_QUOTA_EXCEEDED = "QUOTA_EXCEEDED";
    private static final String ACTION_TENANT_SUSPENDED = "TENANT_SUSPENDED";
    private static final String ACTION_MODEL_UNAVAILABLE = "MODEL_UNAVAILABLE";
    private static final String ACTION_REQUEST_ACCEPTED = "REQUEST_ACCEPTED";
    private static final String ACTION_REQUEST_FAILED = "REQUEST_FAILED";
    private static final String ERROR_TYPE_LLM_SERVICE = "LLM_SERVICE_ERROR";
    private static final String FAILURE_TRIGGER = "__fail__";
    private static final String ACTOR_GATEWAY = "gateway-service";

    private final ApiKeyRepository apiKeyRepository;
    private final LlmModelRepository llmModelRepository;
    private final MonthlyQuotaRepository monthlyQuotaRepository;
    private final ModelPricingRepository modelPricingRepository;
    private final GatewayRequestRepository gatewayRequestRepository;
    private final GatewayResponseRepository gatewayResponseRepository;
    private final DeniedEventRepository deniedEventRepository;
    private final AuditLogRepository auditLogRepository;

    public GatewayService(
            ApiKeyRepository apiKeyRepository,
            LlmModelRepository llmModelRepository,
            MonthlyQuotaRepository monthlyQuotaRepository,
            ModelPricingRepository modelPricingRepository,
            GatewayRequestRepository gatewayRequestRepository,
            GatewayResponseRepository gatewayResponseRepository,
            DeniedEventRepository deniedEventRepository,
            AuditLogRepository auditLogRepository
    ) {
        this.apiKeyRepository = apiKeyRepository;
        this.llmModelRepository = llmModelRepository;
        this.monthlyQuotaRepository = monthlyQuotaRepository;
        this.modelPricingRepository = modelPricingRepository;
        this.gatewayRequestRepository = gatewayRequestRepository;
        this.gatewayResponseRepository = gatewayResponseRepository;
        this.deniedEventRepository = deniedEventRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public GatewayResult submitRequest(String rawApiKey, GatewaySubmitRequest requestBody) {
        ValidationUtils.requireNonBlank(rawApiKey, "X-API-Key");
        if (requestBody == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required");
        }
        ValidationUtils.requirePositiveLong(requestBody.modelId(), "modelId");
        ValidationUtils.requirePositive(requestBody.inputTokens(), "inputTokens");

        String keyHash = HashUtils.sha256Hex(rawApiKey);
        ApiKey apiKey = apiKeyRepository.findByKeyHash(keyHash)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "API key not found"));
        String idempotencyKey = normalizeIdempotencyKey(requestBody.idempotencyKey());

        LlmModel model = llmModelRepository.findById(requestBody.modelId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Model not found"));

        if ("revoked".equals(apiKey.getStatus())) {
            GatewayRequest deniedRequest = createDeniedRequest(apiKey, model, requestBody, idempotencyKey);
            DeniedEvent deniedEvent = createDeniedEvent(deniedRequest, REASON_KEY_REVOKED, null);
            createAuditLog(deniedRequest, apiKey, REASON_KEY_REVOKED, "Request denied because key is revoked");

            GatewaySubmitResponse response = new GatewaySubmitResponse(
                    deniedRequest.getRequestId(),
                    deniedRequest.getStatus(),
                    "API key has been revoked",
                    deniedRequest.getComputedCost(),
                    null,
                    null,
                    null,
                    null,
                    deniedEvent.getReason(),
                    false,
                    deniedRequest.getRequestedAt()
            );
            return new GatewayResult(HttpStatus.FORBIDDEN, response);
        }
        if (idempotencyKey != null) {
            Optional<GatewayRequest> existing = gatewayRequestRepository
                    .findByProjectProjectIdAndIdempotencyKey(apiKey.getProject().getProjectId(), idempotencyKey);
            if (existing.isPresent()) {
                return buildIdempotentResult(existing.get());
            }
        }

        if ("suspended".equals(apiKey.getProject().getTenant().getStatus())) {
            return buildRejectedResult(
                    apiKey,
                    model,
                    requestBody,
                    idempotencyKey,
                    HttpStatus.FORBIDDEN,
                    ACTION_TENANT_SUSPENDED,
                    "Tenant is suspended",
                    "Request denied because tenant is suspended"
            );
        }

        if (!model.isActive()) {
            return buildRejectedResult(
                    apiKey,
                    model,
                    requestBody,
                    idempotencyKey,
                    HttpStatus.BAD_REQUEST,
                    ACTION_MODEL_UNAVAILABLE,
                    "Model is not available",
                    "Request denied because model is inactive"
            );
        }

        String currentMonth = YearMonth.now().toString();
        MonthlyQuota quota = monthlyQuotaRepository.findForUpdate(apiKey.getProject().getProjectId(), currentMonth)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "No quota configured"));

        ModelPricing pricing = modelPricingRepository.findByModelModelIdAndBillingMonth(model.getModelId(), currentMonth)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "No pricing configured"));

        if (containsFailureTrigger(requestBody.prompt())) {
            return buildFailedResult(apiKey, model, requestBody, idempotencyKey);
        }

        int outputTokens = ThreadLocalRandom.current().nextInt(50, 501);
        int latencyMs = ThreadLocalRandom.current().nextInt(200, 3001);
        BigDecimal computedCost = computeCost(
                requestBody.inputTokens(),
                outputTokens,
                pricing.getInputRate(),
                pricing.getOutputRate()
        );

        long updatedTokens = quota.getTokensUsed() + requestBody.inputTokens();
        if (updatedTokens > quota.getTokenLimit()) {
            BigDecimal thresholdPct = quota.getTokenLimit() == 0
                    ? null
                    : BigDecimal.valueOf(quota.getTokensUsed() * 100.0 / quota.getTokenLimit())
                    .setScale(2, RoundingMode.HALF_UP);

            GatewayRequest deniedRequest = createDeniedRequest(apiKey, model, requestBody, idempotencyKey);
            DeniedEvent deniedEvent = createDeniedEvent(deniedRequest, REASON_QUOTA_EXCEEDED, thresholdPct);
            createAuditLog(deniedRequest, apiKey, REASON_QUOTA_EXCEEDED, "Request denied due to quota exceeded");

            GatewaySubmitResponse response = new GatewaySubmitResponse(
                    deniedRequest.getRequestId(),
                    deniedRequest.getStatus(),
                    "Monthly token quota exceeded",
                    deniedRequest.getComputedCost(),
                    null,
                    null,
                    null,
                    null,
                    deniedEvent.getReason(),
                    false,
                    deniedRequest.getRequestedAt()
            );
            return new GatewayResult(HttpStatus.TOO_MANY_REQUESTS, response);
        }

        quota.setTokensUsed(updatedTokens);
        monthlyQuotaRepository.save(quota);

        GatewayRequest successRequest = new GatewayRequest();
        successRequest.setApiKey(apiKey);
        successRequest.setModel(model);
        successRequest.setProject(apiKey.getProject());
        successRequest.setInputTokens(requestBody.inputTokens());
        successRequest.setStatus(STATUS_SUCCESS);
        successRequest.setIdempotencyKey(idempotencyKey);
        successRequest.setComputedCost(computedCost);
        successRequest.setEnvironment(apiKey.getProject().getEnvironment());
        successRequest = gatewayRequestRepository.save(successRequest);

        GatewayResponse gatewayResponse = new GatewayResponse();
        gatewayResponse.setRequest(successRequest);
        gatewayResponse.setOutputTokens(outputTokens);
        gatewayResponse.setLatencyMs(latencyMs);
        gatewayResponse.setHttpStatus(200);
        gatewayResponse.setErrorType(null);
        gatewayResponse.setRawResponse("Mock LLM response generated");
        gatewayResponseRepository.save(gatewayResponse);
        createAuditLog(
                successRequest,
                apiKey,
                ACTION_REQUEST_ACCEPTED,
                formatAcceptedRequestDetails(successRequest, gatewayResponse)
        );

        GatewaySubmitResponse response = new GatewaySubmitResponse(
                successRequest.getRequestId(),
                successRequest.getStatus(),
                "Request accepted",
                successRequest.getComputedCost(),
                gatewayResponse.getOutputTokens(),
                gatewayResponse.getLatencyMs(),
                gatewayResponse.getHttpStatus(),
                gatewayResponse.getErrorType(),
                null,
                false,
                successRequest.getRequestedAt()
        );
        return new GatewayResult(HttpStatus.OK, response);
    }

    private GatewayResult buildIdempotentResult(GatewayRequest existing) {
        if (STATUS_SUCCESS.equals(existing.getStatus())) {
            GatewayResponse response = gatewayResponseRepository.findByRequestRequestId(existing.getRequestId())
                    .orElse(null);
            GatewaySubmitResponse body = new GatewaySubmitResponse(
                    existing.getRequestId(),
                    existing.getStatus(),
                    "Idempotent replay",
                    existing.getComputedCost(),
                    response == null ? null : response.getOutputTokens(),
                    response == null ? null : response.getLatencyMs(),
                    response == null ? null : response.getHttpStatus(),
                    response == null ? null : response.getErrorType(),
                    null,
                    true,
                    existing.getRequestedAt()
            );
            return new GatewayResult(HttpStatus.OK, body);
        }

        if (STATUS_DENIED.equals(existing.getStatus())) {
            String deniedReason = resolveDeniedReason(existing);
            HttpStatus statusCode = toHttpStatus(deniedReason);
            GatewaySubmitResponse body = new GatewaySubmitResponse(
                    existing.getRequestId(),
                    existing.getStatus(),
                    "Idempotent replay",
                    existing.getComputedCost(),
                    null,
                    null,
                    null,
                    null,
                    deniedReason,
                    true,
                    existing.getRequestedAt()
            );
            return new GatewayResult(statusCode, body);
        }

        GatewayResponse response = gatewayResponseRepository.findByRequestRequestId(existing.getRequestId())
                .orElse(null);
        GatewaySubmitResponse body = new GatewaySubmitResponse(
                existing.getRequestId(),
                existing.getStatus(),
                "Idempotent replay",
                existing.getComputedCost(),
                null,
                response == null ? null : response.getLatencyMs(),
                response == null ? null : response.getHttpStatus(),
                response == null ? ACTION_REQUEST_FAILED : response.getErrorType(),
                null,
                true,
                existing.getRequestedAt()
        );
        return new GatewayResult(HttpStatus.BAD_GATEWAY, body);
    }

    private GatewayRequest createDeniedRequest(
            ApiKey apiKey,
            LlmModel model,
            GatewaySubmitRequest requestBody,
            String idempotencyKey
    ) {
        GatewayRequest deniedRequest = new GatewayRequest();
        deniedRequest.setApiKey(apiKey);
        deniedRequest.setModel(model);
        deniedRequest.setProject(apiKey.getProject());
        deniedRequest.setInputTokens(requestBody.inputTokens());
        deniedRequest.setStatus(STATUS_DENIED);
        deniedRequest.setIdempotencyKey(idempotencyKey);
        deniedRequest.setComputedCost(null);
        deniedRequest.setEnvironment(apiKey.getProject().getEnvironment());
        return gatewayRequestRepository.save(deniedRequest);
    }

    private DeniedEvent createDeniedEvent(GatewayRequest request, String reason, BigDecimal thresholdPct) {
        DeniedEvent deniedEvent = new DeniedEvent();
        deniedEvent.setRequest(request);
        deniedEvent.setReason(reason);
        deniedEvent.setThresholdPct(thresholdPct);
        return deniedEventRepository.save(deniedEvent);
    }

    private GatewayResult buildRejectedResult(
            ApiKey apiKey,
            LlmModel model,
            GatewaySubmitRequest requestBody,
            String idempotencyKey,
            HttpStatus httpStatus,
            String action,
            String message,
            String details
    ) {
        GatewayRequest deniedRequest = createDeniedRequest(apiKey, model, requestBody, idempotencyKey);
        createAuditLog(deniedRequest, apiKey, action, details);

        GatewaySubmitResponse response = new GatewaySubmitResponse(
                deniedRequest.getRequestId(),
                deniedRequest.getStatus(),
                message,
                deniedRequest.getComputedCost(),
                null,
                null,
                null,
                null,
                action,
                false,
                deniedRequest.getRequestedAt()
        );
        return new GatewayResult(httpStatus, response);
    }

    private GatewayResult buildFailedResult(
            ApiKey apiKey,
            LlmModel model,
            GatewaySubmitRequest requestBody,
            String idempotencyKey
    ) {
        int latencyMs = ThreadLocalRandom.current().nextInt(200, 3001);

        GatewayRequest failedRequest = new GatewayRequest();
        failedRequest.setApiKey(apiKey);
        failedRequest.setModel(model);
        failedRequest.setProject(apiKey.getProject());
        failedRequest.setInputTokens(requestBody.inputTokens());
        failedRequest.setStatus(STATUS_FAILED);
        failedRequest.setIdempotencyKey(idempotencyKey);
        failedRequest.setComputedCost(null);
        failedRequest.setEnvironment(apiKey.getProject().getEnvironment());
        failedRequest = gatewayRequestRepository.save(failedRequest);

        GatewayResponse failedResponse = new GatewayResponse();
        failedResponse.setRequest(failedRequest);
        failedResponse.setOutputTokens(null);
        failedResponse.setLatencyMs(latencyMs);
        failedResponse.setHttpStatus(500);
        failedResponse.setErrorType(ERROR_TYPE_LLM_SERVICE);
        failedResponse.setRawResponse("Mock LLM failure triggered by __fail__ prompt");
        failedResponse = gatewayResponseRepository.save(failedResponse);

        createAuditLog(
                failedRequest,
                apiKey,
                ACTION_REQUEST_FAILED,
                formatFailedRequestDetails(failedRequest, failedResponse)
        );

        GatewaySubmitResponse response = new GatewaySubmitResponse(
                failedRequest.getRequestId(),
                failedRequest.getStatus(),
                "Mock LLM service failure triggered",
                failedRequest.getComputedCost(),
                failedResponse.getOutputTokens(),
                failedResponse.getLatencyMs(),
                failedResponse.getHttpStatus(),
                failedResponse.getErrorType(),
                null,
                false,
                failedRequest.getRequestedAt()
        );
        return new GatewayResult(HttpStatus.BAD_GATEWAY, response);
    }

    private void createAuditLog(GatewayRequest request, ApiKey apiKey, String action, String details) {
        AuditLog auditLog = new AuditLog();
        auditLog.setRequest(request);
        auditLog.setApiKey(apiKey);
        auditLog.setAction(action);
        auditLog.setPerformedBy(ACTOR_GATEWAY);
        auditLog.setDetails(details);
        auditLogRepository.save(auditLog);
    }

    private String formatAcceptedRequestDetails(GatewayRequest request, GatewayResponse response) {
        return String.format(
                "inputTokens=%d outputTokens=%d cost=%s latencyMs=%d",
                request.getInputTokens(),
                response.getOutputTokens(),
                request.getComputedCost().toPlainString(),
                response.getLatencyMs()
        );
    }

    private String formatFailedRequestDetails(GatewayRequest request, GatewayResponse response) {
        return String.format(
                "inputTokens=%d errorType=%s latencyMs=%d trigger=%s",
                request.getInputTokens(),
                response.getErrorType(),
                response.getLatencyMs(),
                FAILURE_TRIGGER
        );
    }

    private BigDecimal computeCost(
            int inputTokens,
            int outputTokens,
            BigDecimal inputRate,
            BigDecimal outputRate
    ) {
        BigDecimal inputPart = BigDecimal.valueOf(inputTokens)
                .divide(BigDecimal.valueOf(1000), 10, RoundingMode.HALF_UP)
                .multiply(inputRate);
        BigDecimal outputPart = BigDecimal.valueOf(outputTokens)
                .divide(BigDecimal.valueOf(1000), 10, RoundingMode.HALF_UP)
                .multiply(outputRate);
        return inputPart.add(outputPart).setScale(6, RoundingMode.HALF_UP);
    }

    private String normalizeIdempotencyKey(String rawIdempotencyKey) {
        if (rawIdempotencyKey == null || rawIdempotencyKey.isBlank()) {
            return null;
        }
        return rawIdempotencyKey.trim();
    }

    private boolean containsFailureTrigger(String prompt) {
        return prompt != null && prompt.contains(FAILURE_TRIGGER);
    }

    private String resolveDeniedReason(GatewayRequest request) {
        return deniedEventRepository.findByRequestRequestId(request.getRequestId())
                .map(DeniedEvent::getReason)
                .orElseGet(() -> auditLogRepository.findTopByRequestRequestIdOrderByLogIdDesc(request.getRequestId())
                        .map(AuditLog::getAction)
                        .orElse(REASON_QUOTA_EXCEEDED));
    }

    private HttpStatus toHttpStatus(String deniedReason) {
        if (REASON_KEY_REVOKED.equals(deniedReason) || ACTION_TENANT_SUSPENDED.equals(deniedReason)) {
            return HttpStatus.FORBIDDEN;
        }
        if (ACTION_MODEL_UNAVAILABLE.equals(deniedReason)) {
            return HttpStatus.BAD_REQUEST;
        }
        return HttpStatus.TOO_MANY_REQUESTS;
    }

    public record GatewayResult(HttpStatus httpStatus, GatewaySubmitResponse body) {
    }
}
