/** Transactional installation of centrally approved, immutable lawyer bundles. */
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync, renameSync, unlinkSync } from 'node:fs'
import { copyFile, mkdir, readFile, writeFile, rename, rm, lstat } from 'node:fs/promises'
import { join, dirname, resolve, sep } from 'node:path'
import { createServer } from 'node:net'
import { decodeCatalog, fetchBytes, MAX_CATALOG_BYTES, ManagedError, object, type CatalogTrust, type ManagedCatalog, type ManagedRelease } from './catalog.ts'
import { downloadArtifact, verifyCommunityPackage } from './artifact.ts'
import { downloadCommunityArtifact } from './community.ts'
import { runOwned, safeEnvironment, startOwned, type Command } from './process.ts'

export interface ManagedMarketOptions extends CatalogTrust {
  profileDirectory: string
  pnpm: Command
  launcher: Command
  protectedPackages: readonly string[]
  agentsBusy(): boolean
  beginMutation?(): () => void
}
interface Installed { id: string; packageName: string; version: string; sha256: string; source?: string; installedAt: string }
interface Journal { stageHome: string; backup: string; phase: 'prepared' | 'moving' | 'committed' }
const MANIFEST_FILES = ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'cordis.patch.yml', 'cordis.yml', '.lawyer-installations.json']

async function json(path: string): Promise<unknown> { return JSON.parse(await readFile(path, 'utf8')) }
async function atomicJson(path: string, value: unknown): Promise<void> {
  const temporary = `${path}.${randomUUID()}.tmp`
  await writeFile(temporary, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' })
  await rename(temporary, path)
}
function isMissing(error: unknown): boolean { return (error as NodeJS.ErrnoException).code === 'ENOENT' }

export class ManagedMarket {
  readonly root: string
  private active = false
  private pendingRestart = false
  private stage = 'idle'
  private readonly options: Readonly<ManagedMarketOptions>
  constructor(options: ManagedMarketOptions) {
    this.options = Object.freeze({ ...options, protectedPackages: Object.freeze([...options.protectedPackages]) })
    this.root = join(dirname(dirname(resolve(options.profileDirectory))), 'lawyer-market')
  }
  status() { return { managed: true, busy: this.active, stage: this.stage, restartRequired: this.pendingRestart, hostVersion: this.options.hostVersion } }

  /** Every read contacts the single central source; nothing is authorized from a local allowlist. */
  async catalog(signal?: AbortSignal): Promise<ManagedCatalog> {
    await mkdir(this.root, { recursive: true, mode: 0o700 })
    let previous: { revision: number; payload: string } = { revision: 0, payload: '' }
    try { previous = object(await json(join(this.root, 'catalog-state.json'))) as unknown as typeof previous } catch (error) { if (!isMissing(error)) throw error }
    const bytes = await fetchBytes(this.options.catalogUrl, MAX_CATALOG_BYTES, signal)
    const catalog = decodeCatalog(bytes, this.options, previous.revision)
    const payload = String(object(JSON.parse(bytes.toString('utf8'))).payload)
    if (catalog.revision === previous.revision && payload !== previous.payload) throw new ManagedError('CATALOG_REWRITE', '平台目录版本被重复使用', 403)
    // Synchronous compare-and-publish: concurrent HTTP reads cannot move the revision backward.
    const statePath = join(this.root, 'catalog-state.json')
    if (existsSync(statePath)) {
      const latest = object(JSON.parse(readFileSync(statePath, 'utf8')))
      if (typeof latest.revision !== 'number' || latest.revision > catalog.revision) throw new ManagedError('STALE_CATALOG', '目录已更新，请重试', 409)
      if (latest.revision === catalog.revision && latest.payload !== payload) throw new ManagedError('CATALOG_REWRITE', '平台目录版本被重复使用', 403)
    }
    const temp = `${statePath}.${randomUUID()}.tmp`
    try {
      writeFileSync(temp, JSON.stringify({ revision: catalog.revision, payload }), { mode: 0o600, flag: 'wx' })
      renameSync(temp, statePath)
    } finally { if (existsSync(temp)) unlinkSync(temp) }
    return catalog
  }
  async installed(): Promise<Installed[]> {
    let rows: unknown
    try { rows = await json(join(this.options.profileDirectory, '.lawyer-installations.json')) } catch (error) { if (isMissing(error)) return []; throw error }
    if (!Array.isArray(rows)) throw new ManagedError('INVALID_INSTALL_RECORD', '插件安装记录损坏')
    return rows.map(row => {
      const r = object(row)
      if (typeof r.id !== 'string' || typeof r.packageName !== 'string' || typeof r.version !== 'string' || typeof r.sha256 !== 'string') throw new ManagedError('INVALID_INSTALL_RECORD', '插件安装记录损坏')
      return r as unknown as Installed
    })
  }
  private approved(catalog: ManagedCatalog, id: string, version: string): ManagedRelease {
    const release = catalog.plugins.find(p => p.id === id && p.version === version)
    if (release === undefined) throw new ManagedError('NOT_APPROVED', '此插件或版本不在平台许可目录', 403)
    if (!release.hostVersions.includes(this.options.hostVersion)) throw new ManagedError('INCOMPATIBLE_HOST', '此能力尚未兼容当前产品版本', 409)
    if (this.options.protectedPackages.includes(release.packageName)) throw new ManagedError('PROTECTED_PACKAGE', '产品基础组件由发行版本管理', 403)
    if (release.source === 'owned' && release.artifact === undefined) throw new ManagedError('INVALID_CATALOG', '受审制品缺少摘要')
    if (release.source === 'community' && release.install === undefined) throw new ManagedError('INVALID_CATALOG', '社区条目缺少安装目标')
    return release
  }
  async install(id: string, version: string, signal?: AbortSignal): Promise<{ ok: true; restartRequired: true }> {
    return this.mutate(async () => {
      this.stage = 'authorizing'
      const release = this.approved(await this.catalog(signal), id, version)
      const current = await this.installed()
      const artifacts = join(this.root, 'artifacts')
      const spec = release.source === 'owned'
        ? `file:${await downloadArtifact(release, artifacts, signal)}`
        : release.install?.kind === 'npm'
          ? `${release.packageName}@${release.version}`
          : `file:${await downloadCommunityArtifact(release.packageName, release.install, artifacts, signal)}`
      const digest = release.source === 'owned' ? (release.artifact?.sha256 ?? '') : (release.install?.sha256 ?? 'npm')
      this.stage = 'preparing'
      await this.transaction(async stageDir => {
        // Owned artifacts install offline from the verified archive; community
        // releases resolve their own dependencies from npm but never run scripts.
        const args = release.source === 'owned'
          ? [...this.options.pnpm.args, 'add', spec, '--offline', '--ignore-scripts', '--config.auto-install-peers=false']
          : [...this.options.pnpm.args, 'add', spec, '--ignore-scripts', '--config.auto-install-peers=false']
        await runOwned({ ...this.options.pnpm, args }, stageDir, safeEnvironment(), signal)
        const manifest = object(await json(join(stageDir, 'package.json')))
        const dependencies = object(manifest.dependencies)
        if (dependencies[release.packageName] === undefined) throw new ManagedError('INSTALL_FAILED', '安装器没有写入目标插件')
        const installedManifest = object(await json(join(stageDir, 'node_modules', release.packageName, 'package.json')))
        if (installedManifest.name !== release.packageName || installedManifest.version !== release.version) throw new ManagedError('INSTALL_IDENTITY', '安装结果与许可版本不一致')
        if (release.source === 'community') await verifyCommunityPackage(join(stageDir, 'node_modules', release.packageName), release)
        const dsh = object(manifest.dsh), profile = object(dsh.profile)
        const bundles = profile.bundles
        if (!Array.isArray(bundles) || bundles.some(value => typeof value !== 'string')) throw new ManagedError('INVALID_PROFILE', '产品组合配置无效')
        if (!bundles.includes(release.packageName)) bundles.push(release.packageName)
        await atomicJson(join(stageDir, 'package.json'), manifest)
        await atomicJson(join(stageDir, '.lawyer-installations.json'), [...current.filter(p => p.id !== id), { id, packageName: release.packageName, version, source: release.source, sha256: digest, installedAt: new Date().toISOString() }])
      }, signal, async () => {
        const latest = this.approved(await this.catalog(signal), id, version)
        if (latest.source !== release.source) throw new ManagedError('RELEASE_CHANGED', '审核来源已变化，请重新安装', 409)
        if (latest.artifact?.sha256 !== release.artifact?.sha256) throw new ManagedError('RELEASE_CHANGED', '审核制品已变化，请重新安装', 409)
        if (latest.install?.target !== release.install?.target || latest.install?.sha256 !== release.install?.sha256) {
          throw new ManagedError('RELEASE_CHANGED', '社区开放条目已变化，请重新安装', 409)
        }
      })
      return { ok: true, restartRequired: true }
    })
  }
  async uninstall(id: string, signal?: AbortSignal): Promise<{ ok: true; restartRequired: true }> {
    return this.mutate(async () => {
      const current = await this.installed(), target = current.find(p => p.id === id)
      if (target === undefined || this.options.protectedPackages.includes(target.packageName)) throw new ManagedError('PROTECTED_PACKAGE', '只能卸载已安装的业务能力', 403)
      await this.transaction(async stageDir => {
        const manifest = object(await json(join(stageDir, 'package.json'))), deps = object(manifest.dependencies)
        delete deps[target.packageName]
        const profile = object(object(manifest.dsh).profile)
        if (!Array.isArray(profile.bundles)) throw new ManagedError('INVALID_PROFILE', '产品组合配置无效')
        profile.bundles = profile.bundles.filter(p => p !== target.packageName)
        await atomicJson(join(stageDir, 'package.json'), manifest)
        await runOwned({ ...this.options.pnpm, args: [...this.options.pnpm.args, 'install', '--offline', '--no-frozen-lockfile', '--ignore-scripts', '--config.auto-install-peers=false'] }, stageDir, safeEnvironment(), signal)
        await atomicJson(join(stageDir, '.lawyer-installations.json'), current.filter(p => p.id !== id))
      }, signal)
      return { ok: true, restartRequired: true }
    })
  }
  private async mutate<T>(run: () => Promise<T>): Promise<T> {
    // 「重启后生效」不是继续安装的前置条件：环境切换已经把所有待生效的
    // 插件写进当前 profile，后续安装仍从磁盘上的现行 profile 出发，重新走
    // 隔离安装 + 真实启动检查，所以可以在重启前连续安装/卸载多个能力。
    // 仍然只允许一个操作同时进行（进程内 active + 磁盘锁），并继续拦住正在办案的会话。
    if (this.active || this.options.agentsBusy()) throw new ManagedError('BUSY', '请先完成当前任务，或等待当前安装结束', 409)
    const release = this.options.beginMutation?.()
    this.active = true
    const lock = join(this.root, 'operation.lock')
    let owned = false
    try {
      await mkdir(this.root, { recursive: true, mode: 0o700 })
      try { await writeFile(lock, JSON.stringify({ pid: process.pid }), { flag: 'wx', mode: 0o600 }); owned = true } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new ManagedError('BUSY', '另一个安装操作尚未结束，请重新启动产品以恢复', 409)
        throw error
      }
      return await run()
    } finally {
      this.stage = 'idle'; this.active = false; release?.()
      if (owned) await rm(lock, { force: true })
    }
  }
  private async transaction(change: (stageDir: string) => Promise<void>, signal?: AbortSignal, reauthorize?: () => Promise<void>): Promise<void> {
    const profile = this.options.profileDirectory
    if ((await lstat(profile)).isSymbolicLink()) throw new ManagedError('INVALID_PROFILE', '受管产品目录不能是符号链接')
    const stageHome = join(this.root, `stage-${randomUUID()}`), stageDir = join(stageHome, 'profiles', 'lawyer')
    const backup = join(this.root, `previous-${randomUUID()}`)
    const journalPath = join(this.root, 'transaction.json')
    await mkdir(stageDir, { recursive: true, mode: 0o700 })
    let moved = false, committed = false
    try {
      for (const file of MANIFEST_FILES) {
        try { await copyFile(join(profile, file), join(stageDir, file)) } catch (error) { if (!isMissing(error)) throw error }
      }
      await atomicJson(journalPath, { stageHome, backup, phase: 'prepared' } satisfies Journal)
      await change(stageDir)
      this.stage = 'checking'
      await this.healthcheck(stageHome, signal)
      await reauthorize?.()
      signal?.throwIfAborted()
      if (this.options.agentsBusy()) throw new ManagedError('BUSY', '任务已开始，取消本次环境切换', 409)
      await atomicJson(journalPath, { stageHome, backup, phase: 'moving' } satisfies Journal)
      await rename(profile, backup); moved = true
      await rename(stageDir, profile); committed = true; this.pendingRestart = true
      await atomicJson(journalPath, { stageHome, backup, phase: 'committed' } satisfies Journal)
      this.pendingRestart = true
      await rm(journalPath, { force: true })
    } catch (error) {
      if (committed) return // The profile already committed; startup recovery clears any remaining journal.
      if (moved && !committed) { await rename(backup, profile); await rm(journalPath, { force: true }) }
      if (!moved) await rm(journalPath, { force: true })
      throw error
    } finally {
      await rm(stageHome, { recursive: true, force: true })
    }
  }
  private async healthcheck(home: string, signal?: AbortSignal): Promise<void> {
    const socket = createServer()
    await new Promise<void>((resolve, reject) => { socket.once('error', reject); socket.listen(0, '127.0.0.1', resolve) })
    const address = socket.address()
    if (address === null || typeof address === 'string') throw new Error('health port unavailable')
    const port = address.port
    await new Promise<void>(resolve => { socket.close(() => resolve()) })
    const child = startOwned({ ...this.options.launcher, args: [...this.options.launcher.args, '--profile', 'lawyer', '--port', String(port), '--no-open'] }, home, safeEnvironment({ DSH_HOME: home, DSH_TELEMETRY_DISABLED: '1' }), 45_000, signal)
    let failure: unknown
    void child.done.catch(error => { failure = error })
    try {
      const deadline = Date.now() + 35_000
      while (Date.now() < deadline) {
        signal?.throwIfAborted()
        if (failure !== undefined) throw failure
        try {
          const response = await fetch(`http://127.0.0.1:${port}/lawyer-platform/ready`, { signal: AbortSignal.timeout(800), redirect: 'error' })
          if (response.ok && object(await response.json()).ready === true) return
        } catch (error) { if (signal?.aborted) throw error }
        await new Promise(resolve => setTimeout(resolve, 150))
      }
      throw new ManagedError('HEALTHCHECK_FAILED', '新插件环境未通过启动检查，原环境保持不变')
    } finally { await child.stop() }
  }
}

/** Recover interrupted directory switches before launching the managed profile. */
export async function recoverManagedProfile(profileDirectory: string): Promise<void> {
  const profile = resolve(profileDirectory), root = join(dirname(dirname(profile)), 'lawyer-market'), file = join(root, 'transaction.json')
  try {
    const lock = object(await json(join(root, 'operation.lock')))
    if (!Number.isSafeInteger(lock.pid) || Number(lock.pid) < 1) throw new ManagedError('BAD_LOCK', '安装锁无效，请联系管理员')
    try { process.kill(Number(lock.pid), 0); throw new ManagedError('BUSY', '插件管理仍在运行', 409) } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error }
  } catch (error) { if (!isMissing(error)) throw error }
  if (existsSync(file)) {
    const state = object(await json(file))
    const stageHome = String(state.stageHome), backup = String(state.backup)
    if (!resolve(stageHome).startsWith(root + sep + 'stage-') || !resolve(backup).startsWith(root + sep + 'previous-') || dirname(stageHome) !== root || dirname(backup) !== root) throw new ManagedError('BAD_JOURNAL', '安装恢复记录无效')
    if (!existsSync(profile) && existsSync(backup)) await rename(backup, profile)
    if (!existsSync(profile)) throw new ManagedError('RECOVERY_FAILED', '无法恢复产品环境，请联系管理员')
    await rm(stageHome, { recursive: true, force: true })
    await rm(file, { force: true })
  }
  await rm(join(root, 'operation.lock'), { force: true })
}
