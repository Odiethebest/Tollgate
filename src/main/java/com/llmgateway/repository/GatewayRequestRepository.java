package com.llmgateway.repository;

import com.llmgateway.entity.GatewayRequest;
import com.llmgateway.repository.projection.InvoiceAggregateProjection;
import com.llmgateway.repository.projection.KeyRequestProjection;
import com.llmgateway.repository.projection.MissingResponseProjection;
import com.llmgateway.repository.projection.ModelStatsProjection;
import com.llmgateway.repository.projection.ProjectCostProjection;
import com.llmgateway.repository.projection.RevokedUsageProjection;
import com.llmgateway.repository.projection.TopProjectProjection;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GatewayRequestRepository extends JpaRepository<GatewayRequest, Long> {

    Optional<GatewayRequest> findByProjectProjectIdAndIdempotencyKey(Long projectId, String idempotencyKey);

    @Query(value = """
            SELECT COALESCE(SUM(r.computed_cost), 0) AS totalCost,
                   CAST(COALESCE(SUM(r.input_tokens + COALESCE(rs.output_tokens, 0)), 0) AS BIGINT) AS totalTokens
            FROM request r
            LEFT JOIN response rs ON rs.request_id = r.request_id
            WHERE r.project_id = :projectId
              AND r.requested_at >= NOW() - (:days * INTERVAL '1 day')
            """, nativeQuery = true)
    ProjectCostProjection getProjectCostAndTokens(
            @Param("projectId") Long projectId,
            @Param("days") int days
    );

    @Query(value = """
            SELECT p.project_id AS projectId,
                   p.name AS projectName,
                   COALESCE(SUM(r.computed_cost), 0) AS totalCost
            FROM project p
            LEFT JOIN request r
              ON r.project_id = p.project_id
             AND to_char(r.requested_at, 'YYYY-MM') = to_char(CURRENT_DATE, 'YYYY-MM')
            WHERE p.tenant_id = :tenantId
            GROUP BY p.project_id, p.name
            ORDER BY totalCost DESC, p.project_id
            LIMIT 5
            """, nativeQuery = true)
    List<TopProjectProjection> findTopProjectsByTenantForCurrentMonth(@Param("tenantId") Long tenantId);

    @Query(value = """
            SELECT m.model_id AS modelId,
                   m.provider AS provider,
                   m.model_name AS modelName,
                   COALESCE(
                     ROUND(
                       CAST(
                         (100.0 * SUM(CASE WHEN r.status = 'success' THEN 1 ELSE 0 END)
                           / NULLIF(COUNT(r.request_id), 0))
                         AS numeric
                       ),
                       2
                     ),
                     0
                   ) AS successRate,
                   COALESCE(
                     ROUND(
                       CAST(
                         AVG(CASE WHEN r.status = 'success' THEN rs.latency_ms END)
                         AS numeric
                       ),
                       2
                     ),
                     0
                   ) AS avgLatencyMs,
                   COUNT(r.request_id) AS totalRequests
            FROM llm_model m
            LEFT JOIN request r ON r.model_id = m.model_id
            LEFT JOIN response rs ON rs.request_id = r.request_id
            GROUP BY m.model_id, m.provider, m.model_name
            ORDER BY m.model_id
            """, nativeQuery = true)
    List<ModelStatsProjection> getModelStats();

    @Query(value = """
            SELECT r.request_id AS requestId,
                   r.requested_at AS requestedAt,
                   r.status AS status,
                   r.model_id AS modelId,
                   r.project_id AS projectId,
                   r.input_tokens AS inputTokens,
                   r.computed_cost AS computedCost
            FROM request r
            WHERE r.key_id = :keyId
              AND (CAST(:fromTs AS TIMESTAMP) IS NULL OR r.requested_at >= CAST(:fromTs AS TIMESTAMP))
              AND (CAST(:toTs AS TIMESTAMP) IS NULL OR r.requested_at <= CAST(:toTs AS TIMESTAMP))
            ORDER BY r.requested_at DESC
            """, nativeQuery = true)
    List<KeyRequestProjection> findRequestsByKeyAndRange(
            @Param("keyId") Long keyId,
            @Param("fromTs") LocalDateTime fromTs,
            @Param("toTs") LocalDateTime toTs
    );

    @Query(value = """
            SELECT r.request_id AS requestId,
                   k.key_id AS keyId,
                   r.requested_at AS requestedAt,
                   k.revoked_at AS revokedAt,
                   r.project_id AS projectId
            FROM request r
            JOIN api_key k ON k.key_id = r.key_id
            WHERE k.status = 'revoked'
              AND k.revoked_at IS NOT NULL
              AND r.requested_at > k.revoked_at
            ORDER BY r.requested_at DESC
            """, nativeQuery = true)
    List<RevokedUsageProjection> findRevokedKeyUsage();

    @Query(value = """
            SELECT r.request_id AS requestId,
                   r.key_id AS keyId,
                   r.model_id AS modelId,
                   r.project_id AS projectId,
                   r.requested_at AS requestedAt,
                   r.status AS status
            FROM request r
            LEFT JOIN response rs ON rs.request_id = r.request_id
            WHERE rs.request_id IS NULL
            ORDER BY r.request_id
            """, nativeQuery = true)
    List<MissingResponseProjection> findRequestsWithoutResponses();

    @Query(value = """
            SELECT COALESCE(SUM(r.computed_cost), 0) AS totalCost,
                   CAST(COALESCE(SUM(r.input_tokens + COALESCE(rs.output_tokens, 0)), 0) AS BIGINT) AS totalTokens
            FROM request r
            LEFT JOIN response rs ON rs.request_id = r.request_id
            WHERE r.project_id = :projectId
              AND to_char(r.requested_at, 'YYYY-MM') = :billingMonth
            """, nativeQuery = true)
    InvoiceAggregateProjection getInvoiceAggregate(
            @Param("projectId") Long projectId,
            @Param("billingMonth") String billingMonth
    );
}
