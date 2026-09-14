/** Managed-only HTTP facade; legacy community mutation endpoints are not mounted. */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { sameOrigin, readJsonBody, sendJson } from '../http.ts'
import type { MarketHost } from '../routes.ts'
import { ManagedMarket, type ManagedMarketOptions } from './engine.ts'
import { ManagedError, object } from './catalog.ts'

export interface LawyerPlatform {
  marketOptions(): ManagedMarketOptions
  modelStatus(): Promise<unknown>
  saveCredential(value: string): Promise<void>
  refreshModels(): Promise<unknown>
  /**
   * 保存界面提交的模型能力清单（哪些模型可选、每个模型收不收图片）。
   * 只能在本站已开放的模型 id 内做增删与能力声明，不改路由/基址/凭据。
   * 可选：老平台只提供 modelStatus/refreshModels/selectModel，缺这个方法时接口明确报错，
   * 而不是静默当成保存成功。
   */
  saveModels?(models: unknown): Promise<unknown>
  selectModel(id: string): Promise<void>
  /**
   * 有序重启工作台。桌面形态由外壳注入（`desktopRuntime.requestRestart()`）；
   * 没有该能力的形态（如 web）返回 false，客户端据此隐藏重启按钮而不是报错。
   */
  restart?(): Promise<boolean>
}
function fields(value: unknown, allowed: string[]): Record<string, unknown> {
  const body = object(value)
  if (Object.keys(body).some(key => !allowed.includes(key))) throw new ManagedError('UNMANAGED_SETTING', '此设置由平台管理，不能修改', 403)
  return body
}
function text(value: unknown, max: number): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > max) throw new ManagedError('INVALID_REQUEST', '请求参数无效')
  return value
}
/** The shipped product is local-only; same-origin alone does not stop DNS rebinding. */
function localRequest(request: IncomingMessage): boolean {
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress ?? '')) return false
  if (request.headers.forwarded !== undefined || request.headers['x-forwarded-for'] !== undefined || request.headers['x-forwarded-host'] !== undefined) return false
  const host = request.headers.host
  if (typeof host !== 'string' || host.length > 256) return false
  try {
    const url = new URL(`http://${host}`)
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || Number(url.port || '80') !== request.socket.localPort || url.username !== '' || url.password !== '') return false
  } catch { return false }
  return request.headers.origin === undefined || sameOrigin(request)
}
export function mountManagedMarket(host: MarketHost, platform: LawyerPlatform): () => Promise<void> {
  const market = new ManagedMarket(platform.marketOptions())
  const stop = new AbortController(), pending = new Set<Promise<void>>()
  const handler = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const url = new URL(request.url ?? '/', 'http://localhost'), path = url.pathname
    const abort = new AbortController()
    const disconnected = (): void => { if (!response.writableEnded) abort.abort() }
    response.once('close', disconnected)
    const signal = AbortSignal.any([abort.signal, stop.signal])
    try {
      if (!localRequest(request)) throw new ManagedError('UNTRUSTED_REQUEST', '仅允许本机工作台访问', 403)
      if (request.method === 'GET') {
        if (path === '/dsh-market/status') return sendJson(response, 200, market.status())
        if (path === '/dsh-market/installed') return sendJson(response, 200, { installed: await market.installed(), ...market.status() })
        if (path === '/dsh-market/registry') {
          const catalog = await market.catalog(signal)
          const hostVersion = platform.marketOptions().hostVersion
          return sendJson(response, 200, {
            revision: catalog.revision,
            expiresAt: catalog.expiresAt,
            plugins: catalog.plugins.map(({ artifact: _artifact, install: _install, ...plugin }) => ({
              ...plugin,
              compatible: plugin.hostVersions.includes(hostVersion),
            })),
          })
        }
        if (path === '/dsh-market/models') return sendJson(response, 200, await platform.modelStatus())
      }
      if (request.method !== 'POST' || !sameOrigin(request) || request.headers['x-lawyer-market'] !== '1') throw new ManagedError('UNTRUSTED_REQUEST', '不允许此操作来源', 403)
      switch (path) {
        case '/dsh-market/install':
        case '/dsh-market/update': {
          const body = fields(await readJsonBody(request), ['id', 'version'])
          const result = await market.install(text(body.id, 80), text(body.version, 80), signal)
          return sendJson(response, 200, result)
        }
        case '/dsh-market/uninstall': {
          const body = fields(await readJsonBody(request), ['id'])
          return sendJson(response, 200, await market.uninstall(text(body.id, 80), signal))
        }
        case '/dsh-market/credential': {
          const body = fields(await readJsonBody(request), ['key'])
          await platform.saveCredential(text(body.key, 2048))
          return sendJson(response, 200, { ok: true })
        }
        case '/dsh-market/restart': {
          fields(await readJsonBody(request), [])
          if (typeof platform.restart !== 'function') throw new ManagedError('RESTART_UNAVAILABLE', '当前形态不支持一键重启，请手动关闭并重新打开工作台', 400)
          // 有序重启会拆掉整个 Cordis 树：必须先把 202 发出去，再触发重启，
          // 否则请求永远等不到响应，页面会把「正在重启」误判成「不支持重启」。
          let accepted = true
          try { accepted = await platform.restart() } catch { accepted = false }
          if (!accepted) throw new ManagedError('RESTART_UNAVAILABLE', '当前形态不支持一键重启，请手动关闭并重新打开工作台', 400)
          const timer = setTimeout(() => { void platform.restart?.() }, 1200)
          timer.unref?.()
          return sendJson(response, 202, { ok: true, restarting: true })
        }
        case '/dsh-market/refresh-models': {
          fields(await readJsonBody(request), [])
          return sendJson(response, 200, await platform.refreshModels())
        }
        case '/dsh-market/save-models': {
          const body = fields(await readJsonBody(request), ['models'])
          if (typeof platform.saveModels !== 'function') throw new ManagedError('MODEL_SETTINGS_UNAVAILABLE', '当前工作台不支持在界面里配置模型能力，请更新到最新版后重试', 400)
          // 模型行只允许这四个字段：路由、基址、凭据属于产品受管边界，
          // 提交进来必须显式拒绝（403），不能靠下层过滤悄悄丢掉——静默接受等于告诉调用方写成功了。
          const rows = Array.isArray(body.models) ? body.models : []
          for (const row of rows) {
            if (row === null || typeof row !== 'object' || Array.isArray(row)) throw new ManagedError('INVALID_REQUEST', '模型条目格式无效', 400)
            fields(row, ['id', 'name', 'vision', 'contextWindow'])
          }
          return sendJson(response, 200, await platform.saveModels(body.models))
        }
        case '/dsh-market/select-model': {
          const body = fields(await readJsonBody(request), ['model'])
          await platform.selectModel(text(body.model, 256))
          return sendJson(response, 200, { ok: true })
        }
        default: throw new ManagedError('MANAGED_ONLY', '产品只允许通过平台目录管理业务能力；此入口已关闭', 403)
      }
    } catch (error) {
      if (!response.destroyed && !response.headersSent) {
        const known = error instanceof ManagedError
        sendJson(response, known ? error.status : 400, { error: known ? error.message : '操作未完成，请检查配置或联系平台支持', code: known ? error.code : 'OPERATION_FAILED' })
      }
    } finally { response.off('close', disconnected) }
  }
  const dispose = host.webServer.register({ kind: 'prefix', path: '/dsh-market', handler(request, response) {
    const task = handler(request, response)
    pending.add(task)
    void task.finally(() => pending.delete(task)).catch(() => undefined)
    return task
  } })
  return async () => { dispose(); stop.abort(); await Promise.allSettled([...pending]) }
}
