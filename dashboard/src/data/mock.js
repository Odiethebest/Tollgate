export const MOCK = {
  modelsStats: [
    { modelId: 1, provider: 'openai', modelName: 'gpt-4o', successRate: 94.2, avgLatencyMs: 1180, totalRequests: 87 },
    { modelId: 2, provider: 'anthropic', modelName: 'claude-3-5-sonnet', successRate: 88.5, avgLatencyMs: 920, totalRequests: 63 },
    { modelId: 3, provider: 'mistral', modelName: 'mistral-large', successRate: 91.3, avgLatencyMs: 1450, totalRequests: 54 }
  ],
  quotaAlerts: [
    { projectId: 3, projectName: 'ResearchLab-prod', billingMonth: '2026-04', tokensUsed: 44500, tokenLimit: 50000, usagePct: 89.0 },
    { projectId: 5, projectName: 'StartupAI-dev', billingMonth: '2026-04', tokensUsed: 51200, tokenLimit: 50000, usagePct: 102.4 }
  ],
  revokedUsage: [
    { requestId: 14, requestedAt: '2026-04-01T10:23:00', keyId: 2, revokedAt: '2026-03-28T09:00:00', projectId: 1 },
    { requestId: 37, requestedAt: '2026-03-30T14:11:00', keyId: 4, revokedAt: '2026-03-25T12:00:00', projectId: 2 }
  ],
  missingResponses: [
    { requestId: 5, keyId: 9, modelId: 2, projectId: 5, requestedAt: '2026-03-29T20:56:07', status: 'failed' },
    { requestId: 25, keyId: 1, modelId: 1, projectId: 1, requestedAt: '2026-03-09T18:16:07', status: 'failed' }
  ],
  keyRequests: [
    { requestId: 91, requestedAt: '2026-04-02T19:33:50', status: 'success', modelId: 1, projectId: 1, inputTokens: 300, computedCost: 0.0072 },
    { requestId: 85, requestedAt: '2026-01-08T19:27:50', status: 'failed', modelId: 1, projectId: 1, inputTokens: 150, computedCost: null }
  ]
}
