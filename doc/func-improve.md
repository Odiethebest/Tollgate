# Tollgate 功能完善清单

排序原则：不是"哪个看起来最想做"，而是"哪个不先做，后面的演示就会塌"。

---

## P0 数据初始化稳定性

### 1. 停止每次启动自动清库

**当前问题**：`data.sql` 开头执行 `TRUNCATE ... RESTART IDENTITY CASCADE`，服务每次重启都会清空所有数据。

**影响**：演示时现场创建的 tenant、key、request，一重启就全没了，CRUD 可信度归零。

**做法**：
- 把 `TRUNCATE` 从 `data.sql` 移除
- 所有 `INSERT` 改为 `INSERT ... ON CONFLICT DO NOTHING`
- Railway 上首次部署跑一次 seed，之后重启不触碰数据

**完成标准**：服务重启后，数据库里的数据完整保留。

---

### 2. 准备可直接演示的 API Key

**当前问题**：seed 里的 `key_hash` 用 `md5`，运行时鉴权用 `SHA-256`，两者对不上，种子 key 不能直接用于网关调用。

**做法**：在 Spring Boot 里加一个 `DemoKeyInitializer`，实现 `ApplicationRunner`。启动时检查是否存在 label 为 `demo-key` 的 active key，如果不存在就调用 `KeyService` 自动签发一把。Raw key 从环境变量 `DEMO_API_KEY` 读取，本地默认值 `demo-1234-5678`。启动时把 raw key 打印到日志，方便直接复制。

**完成标准**：每次启动日志里都能看到可用的 demo key，无需手动调接口。

---

## P1 核心网关链路补全

### 3. 补齐成功请求的 audit_log

**当前问题**：拒绝路径写 `audit_log`，成功路径不写。审计是整个项目的核心卖点，现在只审计了一半。

**做法**：成功路径在写完 `response` 之后，追加：
```java
auditLogRepository.save(AuditLog.builder()
    .requestId(request.getRequestId())
    .keyId(request.getKeyId())
    .action("REQUEST_ACCEPTED")
    .performedBy("gateway")
    .details(String.format("tokens=%d cost=%.6f", inputTokens, computedCost))
    .build());
```

**完成标准**：每一条请求，无论成功还是被拒，都有结构化审计记录，Audit 页面可以展示完整链路。

---

### 4. 实现可触发的 `failed` 路径

**当前问题**：`failed` 只存在于 seed 数据，运行时永远不会产生，状态定义和实际行为脱节。

**做法**：在 mock LLM 层加入可控失败条件。当 `prompt` 包含关键词 `__fail__` 时，模拟 LLM 服务异常：
- 写入 `request(status='failed')`
- 写入 `response(http_status=500, error_type='LLM_SERVICE_ERROR')`
- 写入 `audit_log(action='REQUEST_FAILED')`
- quota 不扣减，返回 502

这样 `success / failed / denied` 三种状态都可以在演示中真实触发，状态机完整。

**完成标准**：发送含 `__fail__` 的 prompt，能在数据库和前端看到 `failed` 记录。

---

### 5. 补全业务状态校验

**当前问题**：`tenant.status` 和 `llm_model.is_active` 在网关主链路里没有检查，字段只是摆设。

**做法**：在鉴权通过、quota 检查之前，加入：
- `tenant.status == 'suspended'` → 返回 403，写 `audit_log(action='TENANT_SUSPENDED')`
- `llm_model.is_active == false` → 返回 400，message: "Model is not available"

**完成标准**：数据模型里定义的所有状态字段在运行时都有实际效果，没有摆设字段。

---

## P2 CRUD 完整性

### 6. 补齐核心资源的 Read 接口

**当前问题**：管理 API 基本只有 `POST`，没有 list 查询，Create 之后无法验证结果，不是完整 CRUD。

**补充范围**：

```
GET /api/tenants
GET /api/projects?tenantId={id}
GET /api/keys?projectId={id}
GET /api/models
GET /api/quotas?projectId={id}&billingMonth={month}
GET /api/invoices?billingMonth={month}
```

每个接口只需要返回列表，不需要分页，不需要复杂过滤。

**完成标准**：Create 之后立刻能 GET 到结果，CRUD 链路完整闭合。

---

### 7. Update/Delete 口径（无需写代码，只需说清楚）

本项目采用状态迁移代替物理删除，这是审计系统的标准做法：

- API key：`PATCH /api/keys/{id}/revoke` 是软删除，物理记录保留，审计链不断
- model：`is_active` 切换代替删除
- tenant：`status` 切换代替删除
- request / response：append-only，绝不修改或删除，这是审计完整性的核心保障

Presentation 时主动说明这是设计决策，不是功能缺失。老师通常认可这种工程判断。

---

### 8. Invoice 查询闭环

**当前问题**：只有 `POST /api/invoices/generate`，生成后没有查询入口，billing 模块是半成品。

**做法**：`GET /api/invoices?billingMonth={month}` 返回当月所有项目的 invoice 列表。不需要新前端页面，在 AdminPage 里加一个简单表格即可。

**完成标准**：generate 之后能立刻看到结果，不需要靠口头解释。

---

## P3 前端演示层

### 9. 修复 Gateway history 字段缺失

**当前问题**：session history 表里 `modelId` 和 `inputTokens` 显示 `—`，因为后端返回体里没有这两个字段。

**做法**：`setHistory` 时把提交时的 body 一起 merge：

```js
setHistory(prev => [{
  ...data,
  modelId: body.modelId,
  inputTokens: body.inputTokens,
  submittedAt: new Date().toISOString()
}, ...prev].slice(0, 10));
```

**完成标准**：history 表每一列都有真实数据，演示时无空列。

---

### 10. 最小 AdminPage

**前置条件**：P2-6 的 Read 接口完成后再做。

**目标**：一个页面能完整串联"创建 tenant → 创建 project → 签发 key → 设置 pricing → 设置 quota → 生成 invoice → 查看 invoice"。不追求样式，重点是把课程要求的 CRUD 和 Query 在前端里走通一遍。

**页面结构**：左侧表单区（Create 操作），右侧结果区（GET 列表实时刷新）。

---

## P4 工程质量

### 11. 关键路径集成测试

不需要高覆盖率，只需要能展示的结果。按优先级补：

1. 成功请求 → `request + response + audit_log` 全部写入，quota 正确扣减
2. quota exceeded → 返回 429，quota 数值不变
3. revoked key → 返回 403，`audit_log` 写入 `KEY_REVOKED`
4. idempotent replay → 第二次相同 `idempotency_key` 不重复扣 quota

**完成标准**：至少前两个测试 `mvn test` 跑绿，演示时展示测试报告截图作为正确性证明。

---

### 12. CORS 收紧

当前 `allowedOriginPatterns("*")` 对演示没问题。用环境变量区分：

```java
@Value("${cors.allowed-origins:*}")
private String allowedOrigins;
```

Railway 上设置 `CORS_ALLOWED_ORIGINS=https://tollgate.odieyang.com`，本地保持 `*`。

Presentation 时说明："demo 环境开放，生产部署按来源收紧，这是有意识的环境分离。"

---

## Presentation 前最小落地顺序

时间不够时，严格按顺序，做完一步确认再做下一步：

| 步骤 | 任务 | 预估时间 |
|---|---|---|
| 1 | 移除 TRUNCATE，改 ON CONFLICT DO NOTHING | 1 小时 |
| 2 | 加 DemoKeyInitializer | 1 小时 |
| 3 | 成功路径补 audit_log | 30 分钟 |
| 4 | 修 Gateway history 字段（3 行代码） | 15 分钟 |
| 5 | 补 6 个 Read 接口 | 2 小时 |
| 6 | 实现 `__fail__` 触发 failed 路径 | 1 小时 |
| 7 | 补全业务状态校验 | 1 小时 |
| 8 | 最小 AdminPage | 视情况 |
| 9 | 集成测试 | 视情况 |

---

## Presentation 中需要主动说明的边界

提前想好说法，不要被动挨问：

- **没有 user login**：认证主体是 API key，这是 API gateway 的标准设计，不是遗漏。对接的是团队和系统，不是终端用户。
- **LLM 是 mock**：重点在数据库设计、事务一致性和查询层，mock 是刻意的范围控制，符合课程要求。
- **前端是运营 dashboard，不是完整后台管理系统**：定位是监控和审计工具，AdminPage 是辅助演示入口。
- **软删除代替物理删除**：这是审计系统的工程标准，保留历史记录是设计要求，不是偷懒。
- **CORS 当前宽松**：演示环境刻意开放，生产按环境变量收紧，已有配置基础。