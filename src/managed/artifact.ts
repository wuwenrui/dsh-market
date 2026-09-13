/** Verify immutable, self-contained bundles before the package manager sees them. */
import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { join, posix, dirname } from 'node:path'
import * as tar from 'tar'
import yaml from 'js-yaml'
import { fetchBytes, ManagedError, object, type ManagedRelease } from './catalog.ts'

export function assertBundleManifest(value: unknown, release: ManagedRelease): Record<string, unknown> {
  const pkg = object(value)
  if (pkg.name !== release.packageName || pkg.version !== release.version || pkg.type !== 'module') {
    throw new ManagedError('PACKAGE_IDENTITY', '制品包名、版本或模块类型与审核记录不一致')
  }
  for (const field of ['dependencies', 'optionalDependencies']) {
    if (pkg[field] !== undefined && Object.keys(object(pkg[field])).length > 0) {
      throw new ManagedError('EXTERNAL_DEPENDENCIES', '法律市场只接受预构建、自包含插件；请先打包依赖')
    }
  }
  if (pkg.peerDependencies !== undefined && Object.keys(object(pkg.peerDependencies)).some(name => !name.startsWith('@deepseek-ai/'))) {
    throw new ManagedError('UNAPPROVED_PEER', '插件只能使用宿主提供的框架依赖')
  }
  const scripts = pkg.scripts === undefined ? {} : object(pkg.scripts)
  if (['preinstall', 'install', 'postinstall', 'prepare', 'prepack', 'postpack', 'prepublish', 'prepublishOnly'].some(key => scripts[key] !== undefined)) {
    throw new ManagedError('LIFECYCLE_SCRIPT', '插件包含不允许的安装脚本')
  }
  const bundle = object(object(pkg.dsh).bundle)
  if (typeof bundle.patch !== 'string' || !safeRelative(bundle.patch)) throw new ManagedError('INVALID_BUNDLE', '插件补丁路径无效')
  return pkg
}
function safeRelative(path: string): boolean {
  const stripped = path.startsWith('./') ? path.slice(2) : path
  return stripped.length > 0 && !stripped.startsWith('/') && !/[\\:\x00]/.test(stripped) && stripped.split('/').every(part => part !== '..' && part !== '')
}
export function assertBundlePatch(value: unknown, packageName: string): void {
  if (!Array.isArray(value) || value.length === 0) throw new ManagedError('INVALID_BUNDLE', '插件补丁不能为空')
  for (const item of value) {
    const patch = object(item)
    if (Object.keys(patch).some(key => key !== 'insert') || !Array.isArray(patch.insert) || patch.insert.length === 0) {
      throw new ManagedError('PROTECTED_COMPOSITION', '业务插件只能添加自身能力，不能覆盖产品配置')
    }
    for (const raw of patch.insert) {
      const row = object(raw)
      if (typeof row.id !== 'string' || !/^lawyer-[a-z0-9-]+$/.test(row.id) || ['lawyer-platform', 'lawyer-market'].includes(row.id)) {
        throw new ManagedError('PROTECTED_COMPOSITION', '业务插件标识不在许可范围')
      }
      if (typeof row.name !== 'string' || !(row.name === packageName || row.name.startsWith(`${packageName}/`)) || row.group === true) {
        throw new ManagedError('PROTECTED_COMPOSITION', '业务插件不得装载其他软件包')
      }
    }
  }
}

/** Reserved row ids that a community bundle may never insert or replace. */
const RESERVED_ROWS: ReadonlySet<string> = new Set([
  'llm', 'llm-deepseek', 'llm-pi-ai', 'agent-default-model', 'agent-presets', 'persona',
  'session', 'session-log-deepseek', 'session-persistence-jsonl', 'session-telemetry-otel',
  'settings', 'credentials', 'approval', 'permission', 'sandbox', 'sandbox-policy', 'subprocess',
  'tools', 'system-prompt', 'agent', 'jobs', 'webserver', 'web-runtime', 'directory-picker',
  'lawyer-platform', 'lawyer-brand', 'lawyer-market', 'lawyer-directory-picker', 'lawyer-directory-picker-ui',
])

/**
 * Validate a community bundle's composition patch. Community plugins may add
 * their own rows and their own dependencies; they may not replace a product
 * row, mount another package, or create a group.
 */
export function assertCommunityBundlePatch(value: unknown, packageName: string): void {
  if (!Array.isArray(value) || value.length === 0 || value.length > 32) throw new ManagedError('INVALID_BUNDLE', '插件补丁不能为空')
  for (const item of value) {
    const patch = object(item)
    if (Object.keys(patch).some(key => key !== 'insert') || !Array.isArray(patch.insert) || patch.insert.length === 0 || patch.insert.length > 64) {
      throw new ManagedError('PROTECTED_COMPOSITION', '社区插件只能添加自身能力，不能覆盖产品配置')
    }
    for (const raw of patch.insert) {
      const row = object(raw)
      if (typeof row.id !== 'string' || !/^[a-z][a-z0-9-]{0,79}$/.test(row.id) || RESERVED_ROWS.has(row.id)) {
        throw new ManagedError('PROTECTED_COMPOSITION', '社区插件的行标识与产品保留标识冲突')
      }
      if (typeof row.name !== 'string' || !(row.name === packageName || row.name.startsWith(`${packageName}/`)) || row.group === true) {
        throw new ManagedError('PROTECTED_COMPOSITION', '社区插件不得装载其他软件包')
      }
    }
  }
}

/** Verify an installed community package: exact identity plus an insert-only composition. */
export async function verifyCommunityPackage(root: string, release: ManagedRelease): Promise<void> {
  const manifest = object(JSON.parse(await readFile(join(root, 'package.json'), 'utf8')))
  if (manifest.name !== release.packageName || manifest.version !== release.version || manifest.type !== 'module') {
    throw new ManagedError('PACKAGE_IDENTITY', '安装结果与已开放版本不一致')
  }
  const bundle = object(object(manifest.dsh).bundle)
  const patch = bundle.patch
  if (typeof patch !== 'string' || !safeRelative(patch)) throw new ManagedError('INVALID_BUNDLE', '插件补丁路径无效')
  assertCommunityBundlePatch(yaml.load(await readFile(join(root, patch), 'utf8')), release.packageName)
}

export async function verifyArtifact(file: string, release: ManagedRelease): Promise<void> {
  const artifact = release.artifact
  if (artifact === undefined) throw new ManagedError('INVALID_RELEASE', '自有制品缺少审核摘要')
  const bytes = await readFile(file)
  if (bytes.length !== artifact.size || createHash('sha256').update(bytes).digest('hex') !== artifact.sha256) {
    throw new ManagedError('ARTIFACT_INTEGRITY', '插件制品校验失败，未执行安装', 403)
  }
  let size = 0, count = 0
  const names = new Set<string>(), errors: string[] = []
  await tar.t({ file, strict: true, onReadEntry(entry) {
    const path = entry.path.replace(/\/$/, '')
    count++; size += entry.size
    if (!path.startsWith('package/') && path !== 'package') errors.push('archive root')
    if (!safeRelative(path) || posix.normalize(path) !== path || names.has(path)) errors.push('archive path')
    if (entry.type !== 'File' && entry.type !== 'Directory') errors.push('archive links or special files')
    if (size > 128 * 1024 * 1024 || count > 10000 || entry.size > 32 * 1024 * 1024) errors.push('archive limits')
    names.add(path)
  } })
  if (errors.length > 0) throw new ManagedError('UNSAFE_ARCHIVE', '插件压缩包不符合安全解包规范')
  const scratch = await mkdtemp(join(dirname(file), '.verify-'))
  try {
    await tar.x({ file, cwd: scratch, strict: true, preservePaths: false, noChmod: true })
    const root = join(scratch, 'package')
    const manifest = assertBundleManifest(JSON.parse(await readFile(join(root, 'package.json'), 'utf8')), release)
    const patch = object(object(manifest.dsh).bundle).patch as string
    assertBundlePatch(yaml.load(await readFile(join(root, patch), 'utf8')), release.packageName)
    const main = typeof manifest.main === 'string' ? manifest.main : object(manifest.exports)['.']
    const entry = typeof main === 'string' ? main : object(main).default
    if (typeof entry !== 'string' || !safeRelative(entry) || !names.has(`package/${entry.replace(/^\.\//, '')}`)) {
      throw new ManagedError('MISSING_ENTRY', '插件未包含构建后的宿主入口')
    }
    const client = object(manifest.dsh).client
    if (client !== undefined) {
      const path = object(manifest.exports)['./client']
      if (typeof path !== 'string' || !safeRelative(path) || !names.has(`package/${path.replace(/^\.\//, '')}`)) {
        throw new ManagedError('MISSING_CLIENT', '插件未包含构建后的界面')
      }
    }
  } finally { await rm(scratch, { recursive: true, force: true }) }
}

export async function downloadArtifact(release: ManagedRelease, cache: string, signal?: AbortSignal): Promise<string> {
  const artifact = release.artifact
  if (artifact === undefined) throw new ManagedError('INVALID_RELEASE', '自有制品缺少审核摘要')
  await mkdir(cache, { recursive: true, mode: 0o700 })
  const file = join(cache, `${artifact.sha256}.tgz`)
  try { await verifyArtifact(file, release); return file } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  const bytes = await fetchBytes(artifact.url, artifact.size, signal)
  const temporary = await mkdtemp(join(cache, '.download-'))
  const part = join(temporary, 'artifact.tgz')
  try {
    await writeFile(part, bytes, { mode: 0o600, flag: 'wx' })
    await verifyArtifact(part, release)
    // Exclusive publication refuses another writer rather than changing bytes under pnpm.
    try { await writeFile(file, bytes, { mode: 0o600, flag: 'wx' }) } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      await verifyArtifact(file, release)
    }
    return file
  } finally { await rm(temporary, { recursive: true, force: true }) }
}
