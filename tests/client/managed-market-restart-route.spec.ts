/**
 * 宿主侧：/dsh-market/restart 的三种现实。
 * 这是页面上「立即重启」按钮的后端，必须在不支持重启的形态里给出明确 400，
 * 而不是假装成功（用户点了没反应是最糟的失败）。
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountManagedMarket } from '../../src/managed/routes.ts'

const disposers: Array<() => Promise<void>> = []
afterEach(async () => { await Promise.all(disposers.splice(0).map(dispose => dispose())) })

/** 启动一个只挂了受管市场路由的本地服务，返回可访问的端口。 */
async function serve(restart?: () => Promise<boolean>) {
  let handler: ((request: IncomingMessage, response: ServerResponse) => unknown) | undefined
  const host = {
    webServer: {
      register: (route: { handler: (request: IncomingMessage, response: ServerResponse) => unknown }) => {
        handler = route.handler
        return () => { handler = undefined }
      },
    },
  }
  const server = createServer((request, response) => { void handler?.(request, response) })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  const port = typeof address === 'object' && address !== null ? address.port : 0
  const dispose = await mountManagedMarket(host as never, {
    marketOptions: () => ({ profile: 'lawyer', profileDirectory: '/tmp/lawyer-market-route-test', hostVersion: '0.1.5-rc.2', catalogUrl: 'https://example.invalid/catalog.json', trust: { publicKey: '' }, protectedPackages: [] }) as never,
    modelStatus: async () => ({}), saveCredential: async () => {}, refreshModels: async () => ({}), selectModel: async () => {},
    ...(restart === undefined ? {} : { restart }),
  })
  disposers.push(async () => { dispose(); await new Promise<void>(resolve => server.close(() => resolve())) })
  return port
}

async function restart(port: number) {
  // 受管路由要求「本机 + 同源」：真实调用来自同源页面，所以这里补上 Origin（node fetch 不会自带）
  const response = await fetch(`http://127.0.0.1:${port}/dsh-market/restart`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-lawyer-market': '1', origin: `http://127.0.0.1:${port}` },
    body: '{}',
  })
  return { status: response.status, body: await response.json() as { ok?: boolean; error?: string; code?: string } }
}

describe('/dsh-market/restart', () => {
  it('桌面形态：调用外壳的重启能力并回 202', async () => {
    let called = 0
    const port = await serve(async () => { called++; return true })
    const result = await restart(port)
    expect(result.status).toBe(202)
    expect(result.body).toMatchObject({ ok: true, restarting: true })
    // 202 必须先把响应发出去（这是授权检查那次），随后再真正触发重启
    expect(called).toBe(1)
    await vi.waitFor(() => { expect(called).toBe(2) }, { timeout: 4000 })
  })

  it('web 形态（无重启能力）：明确 400 + 可读原因，不假装成功', async () => {
    const port = await serve()
    const result = await restart(port)
    expect(result.status).toBe(400)
    expect(result.body.code).toBe('RESTART_UNAVAILABLE')
    expect(result.body.error).toContain('不支持一键重启')
  })

  it('外壳拒绝重启时同样回 400', async () => {
    const port = await serve(async () => false)
    const result = await restart(port)
    expect(result.status).toBe(400)
    expect(result.body.code).toBe('RESTART_UNAVAILABLE')
  })
})
