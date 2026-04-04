# Tollgate 使用说明（中文）

## 1. 项目背景

`Tollgate` 是一个多租户（Multi-Tenant）的 LLM API 网关后端项目。  
它的核心目标不是“真的调用大模型”，而是把企业里最容易失控的三件事管起来：

- 谁在调用（API Key 鉴权）
- 额度有没有超（配额与并发事务控制）
- 钱花到哪里了（计费、报表、审计）

项目使用 Spring Boot + PostgreSQL，重点在数据库建模、事务正确性和可查询的审计数据。

## 2. 它是干什么的

你可以把它理解为一个“统一入口”：

- 客户端通过 `/api/gateway/submit` 提交请求
- 系统先校验 API Key，再检查是否吊销、是否超配额
- 成功时记录请求与响应，并计算成本
- 失败时记录拒绝原因和审计日志
- 最后通过报表与审计接口查看成本、成功率、异常和合规信息

## 3. 运行前准备

- Java 17+
- Maven 3.8+
- PostgreSQL（建议本地先准备一个测试库）

## 4. 本地怎么运行（最简单）

### 第一步：准备数据库

先创建一个数据库（示例名：`llm_gateway`）：

```sql
CREATE DATABASE llm_gateway;
```

### 第二步：改连接配置

编辑 `src/main/resources/application.properties`，把数据库地址改成你自己的本地配置，例如：

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/llm_gateway
spring.datasource.username=your_user
spring.datasource.password=your_password
```

注意：项目当前配置了 `spring.sql.init.mode=always`，启动时会执行 `schema.sql` 和 `data.sql`。  
`data.sql` 里有 `TRUNCATE`，会清空并重建测试数据，不要直接连生产库运行。

### 第三步：启动项目

```bash
mvn spring-boot:run
```

启动成功后默认地址：

`http://localhost:8080`

## 5. 怎么使用（快速体验）

### 示例 1：创建租户

```bash
curl -X POST http://localhost:8080/api/tenants \
  -H "Content-Type: application/json" \
  -d '{"name":"TechCorp","contactEmail":"admin@techcorp.com","status":"active"}'
```

### 示例 2：网关提交请求（需要 API Key）

```bash
curl -X POST http://localhost:8080/api/gateway/submit \
  -H "X-API-Key: <your-raw-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"modelId":1,"inputTokens":200,"idempotencyKey":"demo-001","prompt":"hello"}'
```

## 6. 打包运行（Maven）

### 打包

```bash
mvn clean package -DskipTests
```

生成产物：

`target/llm-api-gateway-0.0.1-SNAPSHOT.jar`

### 直接运行 Jar

```bash
java -jar target/llm-api-gateway-0.0.1-SNAPSHOT.jar
```

## 7. 主要接口一览

- 管理：`/api/tenants`、`/api/projects`、`/api/keys`、`/api/models`、`/api/pricing`、`/api/quotas`
- 网关：`/api/gateway/submit`
- 报表：`/api/reports/projects/{projectId}/cost`、`/api/reports/models/stats`、`/api/reports/quota-alerts`
- 审计：`/api/audit/keys/{keyId}/requests`、`/api/audit/revoked-usage`、`/api/audit/missing-responses`
- 发票：`/api/invoices/generate?billingMonth=YYYY-MM`
