// @vitest-environment jsdom
/**
 * 「律师能力中心」组件规格：确认弹窗、实时进度、重启闭环。
 *
 * 这四条都是用户能直接看到、且之前缺失或体验很差的地方：
 * 1. 安装前不再是浏览器原生 confirm，而是带能力信息的自绘弹窗；
 * 2. 安装过程按宿主 stage 显示阶段轨道与进度条（不再只是一行文字）；
 * 3. 安装成功后出现「重启后生效」提示，并带「立即重启」按钮；
 * 4. 重启按钮真的调用 /dsh-market/restart，失败时（web 形态）给出明确提示。
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ManagedMarketSection, waitForWorkbenchRestart } from '../../src/client/ManagedMarket.tsx'

const CATALOG = {
  revision: 42,
  plugins: [{
    id: 'lawyer-mail', packageName: '@lawyer-dsh/lawyer-mail', name: '邮件管理', description: '绑定邮箱、读信、回信、存附件',
    category: '邮件', source: 'owned', hostVersions: ['0.1.5-rc.2'], version: '0.1.0', compatible: true,
  }],
}

const STATUS = { busy: false, stage: 'idle', restartRequired: false }
const INSTALLED = { installed: [], ...STATUS }

const t = (key: string) => ({
  market: '律师能力', managed: '仅显示平台审核并允许安装的能力。', retry: '刷新目录', refreshing: '正在刷新…',
  installed: '已安装', available: '可安装能力', loading: '正在加载…', empty: '平台尚未开放可安装的能力',
  install: '安装', update: '更新', remove: '卸载', incompatible: '暂不兼容当前版本', revision: '目录版本',
  confirmTitleInstall: '确认安装这个能力？', confirmRunInstall: '确认安装', cancel: '取消',
  confirmNote: '安装会改动工作台环境。', dialogMetaName: '能力', dialogMetaVersion: '版本', dialogMetaCategory: '分类',
  dialogMetaSource: '来源', dialogMetaState: '当前状态', stateNotInstalled: '未安装', stateInstalled: '已安装', stateUpdatable: '可更新',
  owned: '平台审核', community: '社区', current: '当前版本',
  progress: '正在校验并准备插件环境，请稍候…', progressOf: '步骤', progressWait: '同一时间只允许一个安装操作。',
  stageChecking: '校验环境', stageAuthorizing: '核验授权', stagePreparing: '安装到隔离环境',
  restartTitle: '安装已完成，重启后生效', restartBody: '新能力需要重启工作台才会加载。', restartNow: '立即重启',
  restarting: '正在重启…', restartWaiting: '工作台正在重启，请稍候…', restartDone: '已重启，正在刷新页面…',
  restartTimeout: '等待重启超时。', restartUnavailable: '当前形态不支持一键重启。',
  pending: '等待重启', uninstallAvailableHint: '重启前仍可卸载已安装能力。',
  emptyInstalledTitle: '还没有安装任何能力', emptyInstalledHint: '从下面的列表里选择能力安装。',
  errorTitle: '暂时无法读取平台目录', noFallback: '不会切换到公共社区目录。', retryAction: '重试',
  restartSuccessToast: '已重启，新能力已生效。', failed: '操作未完成', confirm: '确认执行此插件操作？',
}[key] ?? key)

let calls: Array<{ path: string; method: string; body: unknown }> = []
interface Scenario {
  status?: Record<string, unknown>
  installed?: Array<{ id: string; packageName: string; version: string }>
  catalog?: unknown
  install?: unknown
  restart?: unknown
}
function stubFetch(scenario: Scenario = {}) {
  calls = []
  const mock = vi.fn((input: unknown, init?: RequestInit) => {
    const path = String(input).split('?')[0].replace(/^.*\/dsh-market\//, '/dsh-market/')
    const method = (init?.method ?? 'GET').toUpperCase()
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ path, method, body })
    const table: Record<string, unknown> = {
      '/dsh-market/installed': { installed: scenario.installed ?? [], ...(scenario.status ?? STATUS) },
      '/dsh-market/status': scenario.status ?? STATUS,
      '/dsh-market/registry': scenario.catalog ?? CATALOG,
      '/dsh-market/install': scenario.install ?? { ok: true },
      '/dsh-market/uninstall': { ok: true },
      '/dsh-market/restart': scenario.restart ?? { ok: true, restarting: true },
    }
    const payload = table[path]
    if (payload === undefined) return Promise.reject(new Error(`unstubbed fetch: ${path}`))
    const status = payload !== null && typeof payload === 'object' && '__status' in payload ? Number((payload as { __status: number }).__status) : 200
    const value = typeof payload === 'function' ? (payload as () => unknown)() : payload
    return Promise.resolve(new Response(JSON.stringify(value), { status }))
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

beforeEach(() => {
  window.confirm = vi.fn(() => true)
  sessionStorage.clear()
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('律师能力中心', () => {
  it('安装前弹出自绘确认弹窗（不再用浏览器原生 confirm），并展示能力信息', async () => {
    stubFetch()
    render(<ManagedMarketSection t={t} />)
    const install = await screen.findByRole('button', { name: '安装' })
    fireEvent.click(install)

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeTruthy()
    expect(dialog.textContent).toContain('确认安装这个能力？')
    expect(dialog.textContent).toContain('邮件管理')
    expect(dialog.textContent).toContain('v0.1.0')
    expect(dialog.textContent).toContain('未安装')
    expect(window.confirm).not.toHaveBeenCalled()
    // 还没确认，不能发安装请求
    expect(calls.some(call => call.path === '/dsh-market/install')).toBe(false)
  })

  it('确认后才发安装请求，并在安装中显示阶段轨道与进度条', async () => {
    let resolveInstall: ((value: unknown) => void) | undefined
    const pending = new Promise(resolve => { resolveInstall = resolve })
    /** 安装开始后宿主才会报 busy，所以状态桩由安装请求自己切换。 */
    let installing = false
    calls = []
    vi.stubGlobal('fetch', vi.fn((input: unknown, init?: RequestInit) => {
      const path = String(input).split('?')[0].replace(/^.*\/dsh-market\//, '/dsh-market/')
      const method = (init?.method ?? 'GET').toUpperCase()
      const body = init?.body ? JSON.parse(String(init.body)) : undefined
      calls.push({ path, method, body })
      if (path === '/dsh-market/install') {
        installing = true
        return pending.then(() => new Response(JSON.stringify({ ok: true }), { status: 200 }))
      }
      const table: Record<string, unknown> = {
        '/dsh-market/installed': { installed: [], busy: installing, stage: installing ? 'authorizing' : 'idle', restartRequired: false },
        '/dsh-market/status': { busy: installing, stage: installing ? 'authorizing' : 'idle', restartRequired: false },
        '/dsh-market/registry': CATALOG,
      }
      return Promise.resolve(new Response(JSON.stringify(table[path] ?? {}), { status: 200 }))
    }))

    render(<ManagedMarketSection t={t} />)
    fireEvent.click(await screen.findByRole('button', { name: '安装' }))
    fireEvent.click(await screen.findByRole('button', { name: '确认安装' }))

    const progress = await screen.findByRole('progressbar')
    expect(progress.getAttribute('aria-valuemin')).toBe('1')
    expect(progress.getAttribute('aria-valuemax')).toBe('3')
    expect(screen.getByText('校验环境')).toBeTruthy()
    expect(screen.getByText('核验授权')).toBeTruthy()
    expect(screen.getByText('安装到隔离环境')).toBeTruthy()
    expect(calls.find(call => call.path === '/dsh-market/install')?.body).toEqual({ id: 'lawyer-mail', version: '0.1.0' })

    resolveInstall?.(null)
    await waitFor(() => { expect(screen.queryByRole('progressbar')).toBeNull() })
  })

  it('安装后提示需要重启，并提供「立即重启」入口；点击会真的调用重启接口', async () => {
    stubFetch({ status: { busy: false, stage: 'idle', restartRequired: true } })
    render(<ManagedMarketSection t={t} />)

    const banner = await screen.findByText('安装已完成，重启后生效')
    expect(banner).toBeTruthy()
    expect(screen.getByText('新能力需要重启工作台才会加载。')).toBeTruthy()
    expect(screen.getByText('重启前仍可卸载已安装能力。')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '立即重启' }))
    await waitFor(() => { expect(calls.some(call => call.path === '/dsh-market/restart')).toBe(true) })
  })

  it('不支持一键重启的形态（web）：给出明确提示而不是静默失败', async () => {
    stubFetch({ status: { busy: false, stage: 'idle', restartRequired: true }, restart: { __status: 400, error: '当前形态不支持一键重启，请手动关闭并重新打开工作台' } })
    render(<ManagedMarketSection t={t} />)
    fireEvent.click(await screen.findByRole('button', { name: '立即重启' }))
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('当前形态不支持一键重启')
    })
  })

  it('安装失败时显示后端原因', async () => {
    stubFetch({ install: { __status: 409, error: '此能力尚未兼容当前产品版本' } })
    render(<ManagedMarketSection t={t} />)
    fireEvent.click(await screen.findByRole('button', { name: '安装' }))
    fireEvent.click(await screen.findByRole('button', { name: '确认安装' }))
    await waitFor(() => { expect(screen.getByRole('alert').textContent).toContain('此能力尚未兼容当前产品版本') })
  })
})

describe('重启等待策略', () => {
  it('必须先观察到进程真的下线，再看到恢复，才算重启成功', async () => {
    let alive = true
    const reload = vi.fn()
    const load = async () => {
      if (!alive) throw new Error('down')
      return { busy: false, stage: 'idle', restartRequired: false }
    }
    // 第一步：进程还活着（不该判定成功）；第二步起改为下线，随后恢复
    const sleep = (() => {
      let step = 0
      return async () => { step++; if (step === 2) alive = false; if (step === 5) alive = true }
    })()
    const outcome = await waitForWorkbenchRestart({ load, sleep, reload, attempts: 10 })
    expect(outcome).toBe('restarted')
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('一直没恢复则返回超时，不刷新页面', async () => {
    const reload = vi.fn()
    const outcome = await waitForWorkbenchRestart({
      load: async () => { throw new Error('down') },
      sleep: async () => {}, reload, attempts: 5,
    })
    expect(outcome).toBe('timeout')
    expect(reload).not.toHaveBeenCalled()
  })
})
