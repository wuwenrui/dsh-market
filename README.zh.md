# 受管律师能力市场

本项目基于 [dsh-market](https://github.com/dsh-market/dsh-market) 1.47.0 改造，保留上游 MIT 许可证与署名。包名为 `@lawyer-dsh/market`，由法律产品内置，不是装进任意 Web 或第三方 Desktop profile 的通用市场。

## 产品行为

插件目录分两层，**准入始终由产品决定**：

**一份签名目录就是唯一分发点**，客户端只读它：

- **自有能力**：我们发布并 Ed25519 签名的精确制品，按摘要校验后离线安装。
- **社区能力**：社区目录（`awesome-dsh-plugin`）只在**发布时**被读取，用于把已开放的条目解析进我们自己的签名目录；运行时客户端不访问社区源，因此社区站不可用不影响用户。

两层都在同一份 `catalog.json` 里，所以开放/关闭一个社区插件、或上新一个自有插件，都只是**重新发布目录**，用户刷新即可拿到，不需要产品发版。

两层都遵守：

- 安装与更新只接受插件 ID 和精确版本，切换前再次核验许可。社区条目锁定我们审核过的版本，不跟随社区“最新版”。
- 校验包身份、版本、摘要、压缩包安全和宿主版本。
- **社区插件只能 insert 自己的行**：不能覆盖 `llm-pi-ai`、`agent-presets`、`lawyer-platform` 等产品保留行，不能装载别的软件包，不能创建 group。
- 生命周期脚本永不执行；社区插件可以声明依赖，但不会替它运行构建脚本。
- 固定版本的私有 pnpm 离线准备 staging profile，并以独立的真实 Harness 启动检查。活动任务阻止变更，修改过程中阻止新 turn 进入。成功切换后重启生效。
- 失败不改活动 profile，日志支持中断恢复。只能卸载已记录的业务包；基础组件和旧更新、恢复、切源入口不能被用来绕过许可。
- 浏览器提供固定本站的令牌/模型设置和获准法律能力，不开放公共评论、GitHub 加速、任意源或市场自卸载。

放开社区条目只需改产品的社区上架清单并重新发布目录（见 `../lawyer-harness/docs/managed-product.md`），不需要改市场代码、也不需要用户升级。社区条目是第三方可执行代码，审核与版本锁定由我们负责；本版不包含按账号商业授权，也不隔离同进程恶意代码。

## 开发与验证

本仓库使用 npm；配套 workspace 包含 `../deepseek-harness` 和 `../lawyer-harness`。

```sh
npm ci --ignore-scripts
npm run typecheck
npm run build
npm test -- --maxWorkers=4
node ../lawyer-harness/tests/managed/product.e2e.mjs
```

最后一项需要已构建的 Harness 和配套发布器生成的签名测试目录。测试使用真实 DSH、pnpm、插件 tarball 与 Chromium，只模拟远端 HTTP 服务。上游底层工具及回归测试保留，但包入口只挂载受管路由；原第三方 Desktop 适配和社区 Web scaffold 不代表本版产品验收。

准备、启动及中央发布见[产品使用与运维指南](../lawyer-harness/docs/managed-product.md)。不要按上游的 `dsh plugin add dshmarket` 方式装载本 fork。
