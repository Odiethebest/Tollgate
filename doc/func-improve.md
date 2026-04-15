# Tollgate 功能完善清单

排序原则：不是"哪个看起来最想做"，而是"哪个不先做，后面的演示就会塌"。

---

## P0 数据初始化稳定性

### 1. 停止每次启动自动清库

**当前问题**：`data.sql` 开头执行 `TRUNCATE ... RESTART IDENTITY CASCADE`，服务每次重启都会清空所有数据，包括演示时现场创建的 tenant、key、request。

**影响**：老师问"你刚才创建的 project 在哪"，重启之后就没了，CRUD 可信度直接归零。

**做法**：
- 把 `TRUNCATE` 从 `data.sql` 移除
- 改为只在第一次初始化时执行 seed，用 `INSERT ... ON CONFLICT DO NOTHING` 代替无条件插入
- Railway 上只需跑一次 seed，之后重启不会清数据

**完成标准**：服务重启后，数据库里的数据完整保留。

### 2. 准备一把可直接演示的 API Key

**当前问题**：seed 里的 `key_hash` 用的是 `md5`，运行时鉴权用 `SHA-256`，两者对不上，种子 key 无法直接用于网关调用。

**不建议**：改 seed 里的 hash（需要预先算好每个 raw key 的 SHA-256 值，维护成本高）。

**建议做法**：写一个 `DemoKeyInitializer` 组件，应用启动后检查是否存在 label 为 `demo-key` 的 key，如果不存在就自动调用 `KeyService` 签发一把，raw key 固定为环境变量 `DEMO_API_KEY`（本地默认 `demo-1234-5678`），并打印到日志。

**完成标准**：启动日志里能看到 demo key，直接复制进 GatewayTester 就能跑通。

---

## P2 核心网关链路补全

### 3. 补齐成功请求的 audit_log

**当前问题**：拒绝路径会写 `audit_log`，成功路径不写。审计是整个项目的核心卖点，现在只审计了一半。

**做法**：成功路径在写完 `response` 之后，追加一条 `audit_log(action='REQUEST_ACCEPTED', request_id, key_id, performed_by='gateway')`。

**完成标准**：演示时可以说"每一条请求，无论成功还是被拒，都有结构化审计记录"，并在 Audit 页面展示。

### 4. 明确 `failed` 状态口径，选一条路

`failed` 当前只在 seed 数据里存在，运行时不会产生。两个选项，选一个，不要两边都半做：

**推荐选项 B（成本低，风险低）**：从 live demo 的叙事里移除 `failed`。统一口径为"运行时只有 `success` 和 `denied` 两种结果，`failed` 代表 LLM 服务侧异常，当前 mock 层不模拟该场景"。Audit Flags 页面的 Missing Response 数据来自 seed，仍可展示。

**备选选项 A（需要时间）**：在 mock 层加入可控失败条件（例如 prompt 包含关键词 `__fail__`），写入 `request(status='failed')` + `response(http_status=500)` + `audit_log(action='REQUEST_FAILED')`，并说明 quota 不扣减。

**完成标准**：演示时对 `failed` 的解释自洽，不被追问倒。

### 5. 补全业务状态校验

**当前问题**：tenant 是否 suspended、model 是否 active，在网关主链路里没有检查，字段只是摆设。

**做法**：
- 鉴权通过后，检查 `tenant.status`，若为 `suspended` 直接返回 403 并写 `audit_log`
- 检查 `llm_model.is_active`，若为 false 返回 400

**完成标准**：数据模型里定义的状态字段在运行时真正被消费，不是摆设。

---

## P3 CRUD 完整性

### 6. 补齐核心资源的 Read 接口

**当前问题**：管理 API 基本只有 `POST`，没有 list/detail 查询，严格意义上不是完整 CRUD。

**最小补充范围**（够演示就行，不要过度设计）：

```
GET /api/tenants
GET /api/projects
GET /api/keys?projectId={id}
GET /api/models
GET /api/quotas?projectId={id}&billingMonth={month}
GET /api/invoices?projectId={id}
```

**完成标准**：Create 之后能立刻 GET 到结果，演示链路完整。

### 7. 明确 Update/Delete 的口径（不需要写新代码）

这一项不需要补代码，只需要在 presentation 里主动说清楚：

- API key：`revoke` 是软删除，不做物理删除（保留审计链）
- model：`is_active` 切换代替删除
- tenant：`status` 切换代替删除
- request/response：append-only，不允许修改或删除，这是审计完整性的保障

说清楚比补代码更有效，老师通常认可这种设计决策。

### 8. Invoice 查询闭环

**当前问题**：只有 `POST /api/invoices/generate`，没有查询接口，billing 模块是半成品。

**做法**：补 `GET /api/invoices?billingMonth={month}`，返回所有项目当月的 invoice 列表。前端不需要新页面，在 GatewayPage 或 AdminPage 里加一个简单表格即可。

**完成标准**：generate 之后能立刻查看结果，不需要靠口头解释。

---

## P4 前端演示层

### 9. 修复 Gateway history 字段缺失

**当前问题**：`GatewayPage` 的 session history 表里 `modelId` 和 `inputTokens` 显示 `—`，因为返回体里没有这两个字段。

**做法**（3 行代码）：`setHistory` 时把提交时的 `body` 一起 merge 进去：

```js
setHistory(prev => [{
  ...data,
  modelId: body.modelId,
  inputTokens: body.inputTokens,
  submittedAt: new Date().toISOString()
}, ...prev].slice(0, 10));
```

**完成标准**：history 表每一列都有真实数据，演示时没有空列。

### 10. 最小 AdminPage

依赖 P3-6 的 Read 接口完成后再做。最低目标：一个页面能串完"创建 tenant → 创建 project → 签发 key → 设置 pricing → 设置 quota → 提交请求 → 查看 invoice"这条完整链路，不需要复杂样式。

如果 P3-6 没时间补，AdminPage 只做 Create 表单（只需要现有 POST 接口），演示时接受"创建后切到报表页查看结果"的折中路径。

---

## P5 工程质量（时间充裕再做）

### 11. 关键路径集成测试

不需要高覆盖率，只需要能展示的测试结果。优先级排序：

1. quota exceeded → 返回 429，quota 不变
2. revoked key → 返回 403
3. idempotent replay → 不重复扣 quota
4. 成功请求 → request + response + audit_log 全部写入

**完成标准**：至少 2 个测试能在 `mvn test` 里跑绿，演示时展示测试报告截图。

### 12. CORS 与环境配置

当前 `allowedOriginPatterns("*")` 对演示没问题。如果有时间，用环境变量区分 dev/prod，演示时说清楚即可。不是阻塞项。

---

## Presentation 前最小落地顺序

时间不够时，严格按这个顺序，做完一步确认再做下一步：

| 步骤 | 任务 | 预估时间 |
|---|---|---|
| 0 | 修好 Railway 数据库连接，确认线上能访问 | 30 分钟 |
| 1 | 移除启动时 TRUNCATE，改为 ON CONFLICT DO NOTHING | 1 小时 |
| 2 | 加 DemoKeyInitializer，启动后自动签发演示 key | 1 小时 |
| 3 | 成功路径补 audit_log | 30 分钟 |
| 4 | 修 Gateway history 字段缺失（3 行代码） | 15 分钟 |
| 5 | 补最小 Read 接口（6 个 GET） | 2 小时 |
| 6 | 补全业务状态校验（tenant suspended / model inactive） | 1 小时 |
| 7 | 如果还有时间：最小 AdminPage 或集成测试 | 视情况 |

---

## Presentation 中需要主动说明的边界

这些不需要改代码，提前想好怎么说：

- **没有 user login**：本项目的认证主体是 API key，不是终端用户。这是 API gateway 的标准设计，不是遗漏。
- **LLM 是 mock**：重点在数据库设计、事务一致性和查询层，mock 是刻意的范围控制。
- **`failed` 不在 live demo 路径里**：代表 LLM 服务侧异常，mock 层不模拟，seed 数据里有历史记录可以展示。
- **前端是运营 dashboard，不是完整后台管理系统**：定位是监控和审计工具，Admin CRUD 是辅助入口。
- **当前 CORS 宽松**：演示环境刻意开放，生产部署按环境收紧，这是有意识的配置决策。

