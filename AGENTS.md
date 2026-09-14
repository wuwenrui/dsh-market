# AGENTS.md — dsh-market（律师能力市场插件）

> ⚠️ **本仓库属于 Harness 法律产品线。动手前先读整条产品线的维护约定：**
> **[`../docs/harness-maintenance.md`](../docs/harness-maintenance.md)**（上游清单、合并流程、冲突怎么解、门禁、版本联动）。
> 本文件只写本仓库自己的事实。

## 这是什么

`@lawyer-dsh/market`：产品内置的**律师能力市场**——用户在「律师能力」里看到的那一屏，以及受控安装的全部实现。

| 目录 | 作用 |
|---|---|
| `src/client/` | 市场界面（`ManagedMarket.tsx` — 已安装 / 可安装列表、安装·更新·卸载、目录版本、重启提示） |
| `src/managed/` | 受管逻辑：`catalog.ts`（读一份签名目录并验签）、`artifact.ts`（制品校验）、`community.ts`（社区开放清单解析与解析为安装目标）、`engine.ts`（离线 staging + 真实启动检查的安装事务） |
| `lib/` | 构建产物（host + client 两面） |
| `tests/` | 单测与受管行为测试（artifact / catalog / community / routes / transaction） |

## 常用命令

```bash
npm run typecheck
npm run build
npm test -- --maxWorkers=4
```

构建产物 `lib/` 会被 `lawyer-harness` 的 `setup-product.mjs` 与 `dsh-desktop` 的 `vendor/lawyerDesk/market.tgz` 消费。

## 这个插件必须守住的语义

1. **只读一份签名目录**：客户端只认信任锚里的 `catalogUrl`（`model.codingrui.work/lawyer-market/catalog.json`），不访问社区站、不开放任意源、目录不可用时**不回退公共市场**。
2. **只装目录里写死的精确版本**：`id + version` 必须同时命中签名目录，且 `hostVersions` 包含本机 `hostVersion`，否则拒绝安装。
3. **安装是事务**：离线 staging → 制品摘要校验 → 真实启动检查 → 切换前再次核对目录授权；失败保留原环境并提示重启。**重启只是让已装能力生效，不是继续安装的前置条件**：重启提示还在时仍可继续安装/卸载其他能力（同一时间只有一个操作），进度画在对应能力卡片上。
4. **社区条目只能加自己的行**：不能覆盖模型、预设、平台、市场等产品保留行；生命周期脚本永不执行。
5. **不提供**：自卸载、配置恢复导入、构建放行入口、任意 profile 切换。

## 与其它仓库的关系

| 仓库 | 关系 |
|---|---|
| `../lawyer-harness/` | 打包本插件进产品（`vendor/lawyerDesk/market.tgz`），并决定开放清单内容 |
| `../deepseek-harness/` | 宿主内核；本插件作为 bundle 装进产品 profile，依赖其 slots / 服务接口 |
| `../dsh-desktop/` | 桌面形态内置同一份插件 |
| `../new-api/` | 模型站点的「插件目录」管理页负责维护开放清单（页面 → 导出 → 发布） |
