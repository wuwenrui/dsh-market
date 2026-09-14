/** Owned subprocesses for private package-manager and health-check operations. */
import { spawn } from 'node:child_process'
import { killChild } from '../dsh-cli.ts'
import { ManagedError } from './catalog.ts'

export interface Command { file: string; args: string[]; nodeMode?: boolean }
export function safeEnvironment(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const key of ['PATH', 'HOME', 'USERPROFILE', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR', 'LANG', 'LC_ALL']) {
    if (process.env[key] !== undefined) env[key] = process.env[key]
  }
  return { ...env, CI: 'true', ...extra }
}
export interface OwnedChild { done: Promise<void>; stop(): Promise<void> }
export function startOwned(command: Command, cwd: string, env: NodeJS.ProcessEnv, timeoutMs: number, signal?: AbortSignal): OwnedChild {
  const child = spawn(command.file, command.args, { cwd, env: command.nodeMode ? { ...env, ELECTRON_RUN_AS_NODE: '1' } : env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, detached: process.platform !== 'win32' })
  let output = '', timedOut = false, requestedStop = false, settled = false, killTimer: ReturnType<typeof setTimeout> | undefined
  const capture = (chunk: Buffer): void => { output = (output + chunk.toString('utf8')).slice(-8000) }
  child.stdout?.on('data', capture); child.stderr?.on('data', capture)
  const kill = (kind: NodeJS.Signals): void => {
    if (child.pid === undefined || settled) return
    try {
      if (process.platform === 'win32') killChild(child)
      else process.kill(-child.pid, kind)
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error }
  }
  const stop = (): void => {
    requestedStop = true
    kill('SIGTERM')
    killTimer ??= setTimeout(() => { kill('SIGKILL') }, 3000)
    killTimer.unref()
  }
  const timer = setTimeout(() => { timedOut = true; stop() }, timeoutMs)
  const abort = (): void => { stop() }
  signal?.addEventListener('abort', abort, { once: true })
  const done = new Promise<void>((resolve, reject) => {
    child.once('error', reject)
    child.once('close', (code) => {
      settled = true
      if (timedOut) reject(new ManagedError('COMMAND_TIMEOUT', '操作超时，未切换当前环境', 504))
      else if (signal?.aborted) reject(new ManagedError('CANCELLED', '操作已取消', 409))
      else if (code !== 0 && !requestedStop) reject(new ManagedError('COMMAND_FAILED', `插件环境检查失败：${output.replace(/(?:sk-|gh[op]_)[A-Za-z0-9_-]+/g, '[redacted]').replace(/token=[^\s&]+/g, 'token=[redacted]').slice(-2500)}`))
      else resolve()
    })
  }).finally(() => {
    clearTimeout(timer)
    if (killTimer !== undefined) clearTimeout(killTimer)
    signal?.removeEventListener('abort', abort)
  })
  if (signal?.aborted) stop()
  return { done, async stop() { stop(); await done.catch(() => undefined) } }
}
export async function runOwned(command: Command, cwd: string, env: NodeJS.ProcessEnv, signal?: AbortSignal): Promise<void> {
  await startOwned(command, cwd, env, 120_000, signal).done
}
