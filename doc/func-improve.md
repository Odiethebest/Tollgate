# Tollgate 功能完善清单

这份文档用于整理当前项目还没有完善的功能点，并按照代码实际依赖顺序和 presentation 风险来排序任务优先级。

排序原则不是“哪个看起来最想做”，而是“哪个如果不先做，后面的功能和演示都会不稳定或不成立”。

## 排序原则

1. 启动与数据初始化层
   这一层决定应用每次启动后的数据状态是否可靠。如果这里不稳定，后面的 CRUD、报表、演示数据都会失真。
2. 核心网关事务链路
   这是项目最核心的业务链路，直接对应鉴权、配额扣减、审计、计费。
3. 管理 API 与查询层
   这一层决定项目是否真的能覆盖课程要求里的 CRUD 和 query execution。
4. 前端演示层
   这一层决定你能否在 5-6 分钟 demo 中顺畅展示功能，而不是一直切 curl / Postman 补漏洞。
5. 交付与工程质量层
   这一层不一定影响第一次演示，但会影响老师对“工程完整度”的判断。

---

## P0 启动与数据初始化层

这一组任务必须最优先处理，因为它们位于所有功能的最前面。

### 1. 拆分 schema 初始化与 demo seed，停止“每次启动清库”

**当前现状**

- `src/main/resources/application.properties` 中开启了 `spring.sql.init.mode=always`。
- `src/main/resources/data.sql` 一开始就执行 `TRUNCATE ... RESTART IDENTITY CASCADE`。

**问题影响**

- 服务每次启动都会清空并重建演示数据。
- 你现场创建的 tenant、project、api key、request、invoice，只要服务重启就会丢失。
- 这会直接削弱 CRUD 演示的可信度，因为“Create 之后能否持久存在”是最基础的预期。

**为什么优先级最高**

- 所有后续任务都依赖稳定数据。
- 如果这一层不修，老师很容易在问答里抓到“为什么一重启数据就没了”。

**建议动作**

1. 保留 `schema.sql` 自动执行，但把 destructive seed 和基础 seed 拆开。
2. 新增专门的 demo 数据文件，例如：
   - `data-demo.sql`：用于展示时快速重置环境。
   - `data-base.sql`：用于最小可运行初始化。
3. 使用 profile 或环境变量控制是否加载 demo seed。
4. 默认本地开发和部署环境不要自动 `TRUNCATE`。
5. 如果时间不够，至少先把 `TRUNCATE` 从默认启动路径移除。

**完成标准**

- 应用重启后，用户现场新建的数据不会被自动清除。
- 需要重置演示环境时，可以手动切换到 demo seed 模式。

---

### 2. 统一 seed key 与运行时鉴权算法

**当前现状**

- `data.sql` 中种子 `api_key.key_hash` 使用的是 `md5(...) || md5(...)`。
- 运行时 `GatewayService` 使用的是 `SHA-256` 对 `X-API-Key` 做查找。

**问题影响**

- 种子数据里的 key 不能直接用于网关演示。
- 前端 `GatewayPage` 无法直接拿 seed key 跑通，必须先调用 `/api/keys` 现签一把。
- 这会增加 demo 时的操作复杂度，也容易出错。

**为什么排在第二**

- 这个问题直接卡住最关键的 live demo 路径：签发 key -> submit request -> 看 quota/audit/report。

**建议动作**

1. 把 seed 中的 key hash 改成与运行时一致的 SHA-256。
2. 为 demo 准备一组固定 raw key，并在文档中明确记录仅供本地演示使用。
3. 如果不想在数据库中保存 raw key，至少准备一份演示脚本，在启动后自动签发一把测试 key。

**完成标准**

- 演示环境中存在至少一把可直接用于网关调用的测试 key。
- 不需要在 presentation 现场临时解释“为什么种子数据里的 key 不能用”。

---

## P1 核心网关事务链路

这一组任务对应项目最核心的业务正确性。完成 P0 后，应立即处理这些问题。

### 3. 补齐成功请求的 `audit_log`

**当前现状**

- 拒绝路径会写 `audit_log`，包括 `KEY_REVOKED` 和 `QUOTA_EXCEEDED`。
- 成功路径目前只写 `request` 和 `response`，没有写 `audit_log`。

**问题影响**

- 当前并不是真正的“full audit trail”。
- 如果老师追问“成功请求是否也被审计”，目前答案是不完整的。

**为什么优先**

- 审计是 README 和整体项目定位里反复强调的核心卖点。
- 如果成功请求不落审计，系统叙事会出现明显缺口。

**建议动作**

1. 在成功路径中增加 `audit_log` 记录，例如 `REQUEST_ACCEPTED` 或 `REQUEST_COMPLETED`。
2. 明确区分请求被接收、请求执行成功、请求被拒绝三种动作。
3. 确保审计字段能反映 requestId、keyId、performedBy、details。

**完成标准**

- 成功、拒绝两类请求都能在审计表里追溯。
- 演示时可以直接说“每条请求都有结构化审计记录”。

---

### 4. 明确并实现 `failed` 路径，或从 live 功能中移除

**当前现状**

- 数据库和前端都承认 `request.status` 可以是 `success / failed / denied`。
- 种子数据里也有 `failed`。
- 但运行时 `GatewayService.submitRequest()` 实际只会生成 `success` 和 `denied`。

**问题影响**

- 代码语义和真实行为不一致。
- 当前 `failed` 只能靠 seed 数据展示，不是一个真实可演示的功能。
- 老师如果问“failed 和 denied 的区别是什么，怎么触发 failed”，现在很难自洽。

**为什么优先**

- 这是核心业务状态定义不闭合的问题。
- 它会直接影响你对实体设计、状态流转和错误处理的解释。

**建议动作**

两种方案选一个即可，不要两边都半做：

**方案 A：实现真实 failed 路径**

1. 在 mock LLM 层加入可控失败条件，例如：
   - prompt 包含某个特定关键词时触发失败；
   - 或固定小概率失败用于展示。
2. 失败时写入：
   - `request(status='failed')`
   - `response(http_status=500 或 502, error_type=...)`
   - `audit_log(action='REQUEST_FAILED')`
3. 明确失败时 quota 是否回滚，并在 presentation 中说明规则。

**方案 B：从运行时链路中移除 failed**

1. 如果项目当前不打算支持 mock 执行失败，就不要在 live demo 中强调 `failed`。
2. 统一文案，说明当前运行时只有 accepted/denied 两类路径。

**完成标准**

- `failed` 要么可真实触发并落库，要么在 presentation 里不再作为已完成功能出现。

---

### 5. 补全运行时业务状态校验

**当前现状**

- 网关只检查：
  - API key 是否存在；
  - key 是否 revoked；
  - quota 是否存在且未超限；
  - pricing 是否存在。
- 但没有检查：
  - tenant 是否 suspended；
  - model 是否 active；
  - 其他管理态资源是否允许被调用。

**问题影响**

- 数据模型里定义了资源状态，但运行时没有完全消费这些状态。
- 这会让“数据库设计很完整，但业务规则没真正落到服务层”。

**为什么优先**

- 它仍属于网关主链路的一部分，应该在报表和 UI 之前完成。

**建议动作**

1. 若 tenant 为 `suspended`，直接拒绝请求并写审计。
2. 若 model 为 inactive，返回明确错误并阻止提交。
3. 根据需要补充 project 层面的调用限制。

**完成标准**

- 重要业务状态都能在运行时被真正执行。
- 不会出现“状态字段只是摆设”的情况。

---

## P2 管理 API 与 CRUD 完整性

这一组任务决定你是否能自信地说项目覆盖了课程要求中的 CRUD operations。

### 6. 补齐资源管理的“Read”能力

**当前现状**

- 现在的管理接口主要是 `POST` 和少量 `PATCH`。
- 报表接口很多，但资源管理层缺少 list/detail 查询。
- 当前前端也没有 tenant/project/key/model/quota 的管理视图。

**问题影响**

- 严格意义上，这不是完整 CRUD。
- 你可以演示 Create，但不能自然演示“创建后查看资源列表/详情”。

**为什么排在这里**

- 先要保证启动稳定、网关链路正确，补 Read 才有意义。
- 同时它是前端管理页的前置依赖。

**建议动作**

至少补齐以下只读接口：

1. `GET /api/tenants`
2. `GET /api/tenants/{id}`
3. `GET /api/projects`
4. `GET /api/projects/{id}`
5. `GET /api/keys`
6. `GET /api/models`
7. `GET /api/quotas`
8. `GET /api/invoices` 或 `GET /api/invoices/{billingMonth}`

**完成标准**

- 每个被创建的核心资源，都至少能被读取和展示。
- 你可以在 demo 中自然地说“先创建，再查询结果”。

---

### 7. 明确资源管理的 Update/Delete 边界

**当前现状**

- 目前比较清晰的 Update 只有：
  - revoke key；
  - pricing upsert；
  - quota upsert。
- tenant、project、model 等没有显式更新能力。
- Delete 也基本不存在。

**问题影响**

- 如果老师严格按 CRUD 问，你现在只能部分回答。
- 另外，某些资源本来不适合物理删除，例如 key 和 request。

**为什么排在 Read 之后**

- 先把可读链路补齐，再讨论管理动作的边界更合理。

**建议动作**

1. 不要为了凑 CRUD 强行加物理删除。
2. 明确采用“软状态管理”的资源：
   - API key：revoke 代替 delete；
   - model：active/inactive 代替 delete；
   - tenant：active/suspended 代替 delete。
3. 对适合更新的资源补 `PATCH`：
   - tenant status；
   - project name/environment；
   - model active；
   - quota limit/cost limit。
4. 如果确实要做 delete，只建议给 demo 环境专用资源做受控删除。

**完成标准**

- 你能清楚说明“哪些是 Create/Read/Update/Delete，哪些采用状态迁移代替删除”。
- 课程演示里不会被问倒在 CRUD 定义上。

---

### 8. 补上 invoice 的查询和展示闭环

**当前现状**

- 现在只有 `POST /api/invoices/generate`。
- 生成后没有配套的发票读取页面或专门查询接口。

**问题影响**

- 你可以说“系统支持生成 invoice”，但现场不容易展示“生成后的结果如何管理和查询”。
- 这会让 billing 模块像是一个半成品。

**建议动作**

1. 增加 invoice 列表或按月查询接口。
2. 最小化前端展示一张 invoice table 即可。
3. 如果时间不够，至少准备好 Postman/curl + 返回 JSON 的展示路径。

**完成标准**

- Invoice 生成之后，可以立刻看到结果，而不是只能口头解释。

---

## P3 前端演示层

这一组任务决定你的 5-6 分钟 demo 是否顺滑。

### 9. 修复 Gateway session history 的上下文字段缺失

**当前现状**

- `GatewayPage` 在成功提交后把返回体 `data` 塞进 `history`。
- 但返回体里没有 `modelId` 和 `inputTokens`。
- 因此前端 history 表里的对应列会显示 `—`。

**问题影响**

- 这是一个非常容易在现场被看到的小瑕疵。
- 它会让页面看起来不像完整工具，更像草稿版 demo。

**为什么排在前端层第一位**

- 修改成本很低，但收益很高。
- 它直接改善 live demo 观感。

**建议动作**

1. 把提交时的 `body` 一起写入 history。
2. 或者让后端返回 `modelId`、`inputTokens`。
3. 成本最低的做法是前端在 `setHistory` 时自己 merge：
   - `modelId`
   - `inputTokens`
   - `idempotencyKey`
   - `prompt` 可选

**完成标准**

- Session history 每一列都能展示真实上下文。

---

### 10. 为 admin / invoice 增加最小可演示入口

**当前现状**

- 前端目前只覆盖：
  - overview
  - quota
  - models
  - audit
  - gateway
- 没有 admin 资源管理页，也没有 invoice 页。

**问题影响**

- 你演示 Create tenant/project/key/pricing/quota 时只能切到 Postman 或 curl。
- 页面体验和叙事会断掉。

**为什么排在这里**

- 这一步依赖前面的 Read/list API 完成。
- 如果 API 不补，这一步也做不起来。

**建议动作**

最低成本方案：

1. 新增一个简单的 `AdminPage`，包含：
   - Create tenant
   - Create project
   - Issue key
   - Create pricing
   - Create quota
2. 新增一个简单的 `InvoicesPage`：
   - generate invoice
   - list generated invoices
3. 不追求复杂样式，重点是把“课程要求里的 CRUD/Query”串成一个闭环。

**完成标准**

- 大部分演示可以在同一个前端里完成，不需要频繁切换工具。

---

### 11. 给 presentation 准备明确的“auth 口径”

**当前现状**

- 课程模板里写了 “User login (if applicable)”。
- 当前项目没有用户登录，而是 API key 认证。

**这不是 bug，但需要主动说明**

- 如果你不提前说明，老师可能会下意识问“登录在哪”。

**建议动作**

1. 在 presentation 里明确说明：
   - 本项目不做 end-user login；
   - 认证机制是 `X-API-Key`；
   - 因为这是一个 multi-tenant API gateway，而不是面向普通终端用户的 SaaS 页面。
2. 最好在架构图或开场页就讲清楚。

**完成标准**

- “为什么没有 login” 不再成为现场的被动解释点。

---

## P4 交付与工程质量

这一组任务不一定是最先做，但会影响老师对项目完成度的整体印象。

### 12. 补自动化测试

**当前现状**

- 目前仓库里没有 `src/test`。

**问题影响**

- 并发锁、配额扣减、幂等、报表查询都只能靠口头解释和手工验证。
- 对一个数据库课程项目来说，这会显得验证证据偏弱。

**建议动作**

至少补三类测试：

1. `GatewayService` 单元或集成测试：
   - valid key -> success
   - revoked key -> 403
   - quota exceeded -> 429
   - idempotent replay -> 不重复扣 quota
2. repository query 测试：
   - model stats
   - quota alerts
   - missing responses
3. validation 测试：
   - invalid billing month
   - invalid environment
   - invalid keyId/date range

**完成标准**

- 至少能展示一组测试结果证明关键逻辑被验证过。

---

### 13. 将 dashboard build 纳入后端打包/部署流程

**当前现状**

- `dashboard/vite.config.js` 会把前端 build 输出到 `src/main/resources/static`。
- 但后端 `Dockerfile` 只复制 `pom.xml` 和 `src/`，不会自动构建 `dashboard/`。

**问题影响**

- 如果前端源码更新后忘记先手动 build，部署出去的仍可能是旧页面。
- 这会带来“代码是新的，页面却是旧的”的交付风险。

**建议动作**

1. 在 CI/CD 或 Maven build 前加入 dashboard build 步骤。
2. 至少在部署文档里写清楚：
   - `cd dashboard && npm run build`
   - 再执行后端打包。
3. 更完整的做法是把前端构建并入统一构建链路。

**完成标准**

- 前端静态资源不会依赖手工同步。

---

### 14. 收紧 CORS 与环境配置

**当前现状**

- `CorsConfig` 对 `/api/**` 采用 `allowedOriginPatterns("*")`。
- 当前配置更偏 demo 友好，不偏生产安全。

**问题影响**

- 对课程演示不是大问题，但会影响“是否 production-ready”的回答。

**建议动作**

1. 用环境变量区分 dev/demo/prod 的允许源。
2. 对演示环境保留宽松策略，对生产环境收紧。
3. 一并整理 `app.yaml`、`.env.example`、本地运行文档里的配置说明。

**完成标准**

- 你可以在答辩中明确说：当前 demo 为了联调方便开放 CORS，但生产部署会按环境收紧。

---

## Presentation 前的最小落地顺序

如果离 presentation 只剩很短时间，建议按下面顺序补：

1. **先做 P0-1**：停止启动时自动清库。
2. **再做 P0-2**：准备一把可直接演示的 API key。
3. **再做 P1-3**：补齐成功路径的 audit log。
4. **再做 P3-9**：修 Gateway history 字段缺失。
5. **再做 P2-6**：至少补一个最小资源读取链路，用来支持 CRUD 口径。
6. **如果还有时间**：补 `failed` 路径或补最小 `AdminPage`。

---

## Presentation 中需要主动说明的边界

下面这些内容不一定都要在演示前改完，但最好主动说明，避免被动挨问：

1. 本项目采用 API key 认证，不做传统 user login。
2. LLM 执行层是 mock，重点在数据库设计、事务一致性、审计和 SQL 查询。
3. 当前前端更偏“运营 dashboard + gateway tester”，不是完整后台管理系统。
4. 目前最完整的闭环是：
   - 创建配置
   - 提交网关请求
   - 观察 quota / audit / reports / invoices

---

## 一句话总结

当前项目的核心数据库设计和网关事务链路已经成型，但要更好地满足期末 presentation 和课程要求，最需要优先补的是：

**数据初始化稳定性、可直接演示的鉴权链路、审计闭环、CRUD 完整性、以及前端演示入口。**
