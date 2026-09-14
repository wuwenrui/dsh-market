# VERIFY — 「已安装卡片版本行」修复到 LawyerDesk 真实界面的必经链路

勘察时间：本机、只读。修复源码落点：`dsh-market/src/client/ManagedMarket.tsx:9`（新增 `installedVersion: '已装版本'` / `updateTo: '可更新至'`）与 `:387`
（新行：`meta={`${t('installedVersion')} v${item.version}${updatable ? ` · ${t('updateTo')} v${known.version}` : ''}`}`）。

---

## 结论 1：`dsh-desktop/lawyer-desktop/client.js` **不参与**产品构建，也不参与运行

| # | 证据 | 位置/输出 |
|---|---|---|
| 1 | 该包 client 构建输出到 `lib/`，文件名为 `lib/client.js`，loader id 是桌面自己（`lawyer-dsh-desktop`），不是根目录 `client.js` | `lawyer-desktop/tsdown.config.ts:59-91`（`outDir:'lib'`:63、`entryFileNames:'client.js'`:86、`banner id: PACKAGE_NAME`:87、`const PACKAGE_NAME='lawyer-dsh-desktop'`:3）；`head -c 300 lawyer-desktop/lib/client.js` → `window.__ModuleLoader__.load({ id: "lawyer-dsh-desktop"` |
| 2 | 包 manifest 不声明它：`main`=`lib/main.js`、`exports["./client"]`=`./lib/client.js`、`files` 白名单无根 `client.js` | `lawyer-desktop/package.json:15`、`:30`、`:76-95` |
| 3 | 打包白名单（electron-builder `build.files`）同样只有 `lib/**` 等，根 `client.js` 不在内 | `lawyer-desktop/package.json:354-364` |
| 4 | 成品 `app.asar` 里没有根 `client.js` | `node -e "…asar.listPackage…"` → root-level js = 仅 `/lib/*.js`；`/client.js` 不存在（asar 共 20298 条） |
| 5 | git 里它根本未被跟踪，上层也没有同名文件是跟踪态 | `git status --short lawyer-desktop/client.js` → `?? lawyer-desktop/client.js`；`git ls-files \| grep 'client\.js$'` → 空 |
| 6 | 全仓无任何脚本/配置引用它 | `grep -rn "lawyer-desktop/client.js\|'\./client\.js'"`（排除 node_modules/lib/dist）只命中 tsdown 配置与 `tests/host-process-integration.spec.ts:31` 的合成 fixture 字符串 |

附：该文件的第 1 行 loader id 是 `@lawyer-dsh/market`（1151 行 / sha256 `fe86445d…`），即一份**手工拷贝的旧市场客户端**，既非本包产物，也非任何安装源。它现在唯一的作用是误导 grep；对修复无影响（未跟踪、可忽略）。

---

## 结论 2：让修复出现在 LawyerDesk 界面的最短必经链路

### 关键事实（决定「要不要动 profile」）

运行时生效的不是 profile 里那份 `@lawyer-dsh/market`，而是 **app.asar 内置那份**：

- 解析规则：桌面安装目录候选（install）与 profile 候选（profile）**版本相等时取 install**；
  `install.version === profile.version` → 选 install。
  `lawyer-desktop/src/package-overlay.ts:122-130`（注释：Equal SemVer … keeps the Desktop copy as the deterministic tie-break）。
- 该规则对客户端 bundle 同样生效：宿主客户端扫描在 `loader.internal` 不可用时退回 `createRequire(baseUrl).resolve('<包>/package.json')`（`deepseek-harness/packages/client/modules/src/index.ts:797-806`），
  这个 CJS require 被 `lawyer-desktop/src/module-resolution.ts` 的 hook 接管（`:496-503`），命中同一 overlay 规则。
- 版本实测相等：app.asar 内 `@lawyer-dsh/market` = `1.45.0-lawyer.1`；profile 内同名包 = `1.45.0-lawyer.1`。
- 内容实测：app.asar 内 `client/client.js` sha256 `84d65f1f…`（**含 bug**：`current: "当前版本"`，无 `installedVersion`），
  与 `vendor/lawyerDesk/market.tgz` 内的同一文件 `84d65f1f…` 完全一致；
  而工作区已修版本 `dsh-market/client/client.js` = `784b2cf9…`（含 `installedVersion: "已装版本"`）**尚未进入任何被加载的副本**。
- 正在跑的真实 app 就是这个 install 副本：`/Applications/LawyerDesk.app/Contents/Resources/app.asar` sha256 `15b4ddb4…`
  ≡ 仓库 `lawyer-desktop/dist/mac-arm64/LawyerDesk.app/…/app.asar`；renderer 命令行 `--app-path=/Applications/LawyerDesk.app/Contents/Resources/app.asar`（pid 32367）。

本机 profile 现状（与 vendor tgz **不一致**，但不影响修复）：`~/.lawyercopilot-managed-desktop/profiles/lawyer/package.json` 把 market 钉在旧缓存制品
`product-artifacts/11d7fe39….tgz`（9/8，client.js 457 行 / 20KB / sha `b509fa0b…`）；当前 vendor tgz 是 `1f466fcc…`（9/12 23:04）。
profile 不会自动跟随 vendor：`managed-product.ts:64-73` 对已存在 profile 直接 `syncProductBundles` 后 return，不回灌新制品。

### 精确命令（每步产物）

```bash
# ① 市场包：重建客户端 bundle（Lead 已做）→ dsh-market/client/client.js (784b2cf9…)
cd lawyerDesk/dsh-market && npm run build:client

# ② 打包进桌面内置制品（无现成脚本，npm pack 后改名；tgz 内部布局 package/**）
npm pack --pack-destination /tmp/market-pack
cp /tmp/market-pack/lawyer-dsh-market-1.45.0-lawyer.1.tgz \
   ../dsh-desktop/vendor/lawyerDesk/market.tgz
shasum -a 256 ../dsh-desktop/vendor/lawyerDesk/market.tgz      # 记下新摘要（旧: 1f466fcc…）

# ③ 刷新桌面安装副本（运行时真正加载的那份）：yarn.lock 里的 hash=bf0f25 会随之更新
cd ../dsh-desktop
npm exec --yes --package=corepack@0.34.6 -- corepack yarn install    # 不要加 --immutable
shasum -a 256 lawyer-desktop/node_modules/@lawyer-dsh/market/client/client.js   # 必须 == 784b2cf9…

# ④ 重新打包 app（先清 lib，见维护约定「打包前必做」）
rm -rf lawyer-desktop/lib
npm exec --yes --package=corepack@0.34.6 -- corepack yarn workspace lawyer-dsh-desktop package:dir
# 产物：lawyer-desktop/dist/mac-arm64/LawyerDesk.app
# 校验：app.asar 内 node_modules/@lawyer-dsh/market/client/client.js == 784b2cf9…
#       Resources/lawyerDesk/market.tgz == 步骤②新摘要（afterPack 脚本 verify-lawyer-package.mjs 也会比对）

# ⑤ 让用户在真实入口看到（当前有实例在跑：pid 32153，单实例锁，必须先退出）
osascript -e 'quit app "LawyerDesk"'
rm -rf /Applications/LawyerDesk.app && cp -R lawyer-desktop/dist/mac-arm64/LawyerDesk.app /Applications/
open /Applications/LawyerDesk.app     # 设置 → 律师能力 → 已安装
```

**必经步骤 = ②③④⑤；① 已完成。profile 不需要重装/清空**（版本相等时 install 恒胜）。
app.asar 不要手改：`build.electronFuses.enableEmbeddedAsarIntegrityValidation=true` + `onlyLoadAppFromAsar=true`（`package.json:333-352`），手改会让完整性校验失败，必须重新打包。

---

## 结论 3：本机**能**启动 LawyerDesk 做视觉验证；现成脚本 + 截图能力齐备

- Electron 43.3.0 二进制在：`dsh-desktop/lawyer-desktop/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron`（存在、可执行）。
- 现成脚本：`lawyer-desktop/scripts/test-managed-desktop.mjs`（`npm run test:managed-native` / `--packaged`；根别名 `test:lawyer:native`）。
  它用 Playwright `_electron` 真启动 Electron + 真 Web carrier，服务只 mock 模型站/目录（`dsh-market/node_modules/playwright` 存在）。
- 截图能力：脚本自带 `screenshot()`（`:79-82`，`page.screenshot`），证据落在 `lawyer-desktop/dist/e2e-source|e2e-packaged`。
  最近一次成功运行（9/12 15:58）：`dist/e2e-source/report.json` → `"ok": true`、`pageErrors: []`、`realPluginInstall` 两项；
  截图 `04-managed-market.png` 已确认是「设置 → 律师能力」整页（「已安装 0 / 可安装能力 3」）。
- 运行中的真实产品本身也是可启动性的实证：`/Applications/LawyerDesk.app` pid 32153（11:26 启动）。

**卡点（唯一）**：`test-managed-desktop.mjs` 的「律师能力」截图拍在安装动作**之前**（`:115` 截图 → `:117` 才 `install lawyer-filing`），
所以现成脚本截图里看不到「已装版本 v…」那一行。要肉眼验证修复，二选一：
(a) 走结论 2 的 ⑤，用真实 app + 真实 profile（该 profile 已装 `lawyer-mail@0.2.5`，`profiles/lawyer/.lawyer-installations.json`）；
(b) 在 `:117` 之后补一次 `request('installed')` + `screenshot('04b-installed-card')`（改测试脚本，需另授权）。

**无法判定项**：无。唯一没能做的是从运行中的 app HTTP 端口（127.0.0.1:52303）抓取已服务的 bundle——该端口对普通请求返回 403（产品设计），
因此「app.asar 那份生效」是由 overlay 规则 + 两侧版本相等 + app.asar 内客户端摘要判定，**不是**抓包实证；修复落地后若 ⑤ 一步生效（不动 profile 就变），即为该判定的运行时反证。
