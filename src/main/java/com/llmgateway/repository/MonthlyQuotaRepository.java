package com.llmgateway.repository;

import com.llmgateway.entity.MonthlyQuota;
import com.llmgateway.repository.projection.QuotaAlertProjection;
import java.util.Optional;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

public interface MonthlyQuotaRepository extends JpaRepository<MonthlyQuota, Long> {

    Optional<MonthlyQuota> findByProjectProjectIdAndBillingMonth(Long projectId, String billingMonth);

    List<MonthlyQuota> findByProjectProjectIdOrderByBillingMonthDesc(Long projectId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select q from MonthlyQuota q
            where q.project.projectId = :projectId and q.billingMonth = :billingMonth
            """)
    Optional<MonthlyQuota> findForUpdate(
            @Param("projectId") Long projectId,
            @Param("billingMonth") String billingMonth
    );

    @Query(value = """
            SELECT p.project_id AS projectId,
                   p.name AS projectName,
                   q.billing_month AS billingMonth,
                   q.tokens_used AS tokensUsed,
                   q.token_limit AS tokenLimit,
                   ROUND(CAST((q.tokens_used * 100.0 / NULLIF(q.token_limit, 0)) AS numeric), 2) AS usagePct
            FROM monthly_quota q
            JOIN project p ON p.project_id = q.project_id
            WHERE q.billing_month = :billingMonth
              AND (q.tokens_used * 100.0 / NULLIF(q.token_limit, 0)) > :threshold
            ORDER BY usagePct DESC
            """, nativeQuery = true)
    List<QuotaAlertProjection> findQuotaAlerts(
            @Param("billingMonth") String billingMonth,
            @Param("threshold") double threshold
    );
}
