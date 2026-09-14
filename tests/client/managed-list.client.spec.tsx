// @vitest-environment jsdom
/**
 * 「律师能力」列表交互规格（本次用户反馈的三条）：
 * 1. 已安装 / 可安装用 tab 分开，不再上下堆在一屏；
 * 2. 可以按名称/分类/说明搜索；
 * 3. 装着的版本比目录旧时，已安装那一栏里要能直接点「更新」（并标出「可更新」）。
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ManagedMarketSection } from '../../src/client/ManagedMarket.tsx'

const zh: Record<string, string> = {
  market: '律师能力', models: '模型服务', loading: '正在加载…', retry: '刷新目录', empty: '平台尚未开放可安装的能力',
  installed: '已安装', available: '可安装能力', install: '安装', update: '更新', remove: '卸载',
  incompatible: '暂不兼容当前版本', managed: '仅显示平台审核并允许安装的能力。', revision: '目录版本',
  confirmTitleInstall: '确认安装这个能力？', confirmTitleUpdate: '确认更新这个能力？', confirmTitleUninstall: '确认卸载这个能力？',
  confirmRunInstall: '确认安装', confirmRunUpdate: '确认更新', confirmRunUninstall: '确认卸载', cancel: '取消',
  confirmNote: '安装会改动工作台环境。', confirmNoteUninstall: '卸载后该能力立即移除。',
  dialogMetaName: '能力', dialogMetaVersion: '版本', dialogMetaCategory: '分类', dialogMetaSource: '来源', dialogMetaState: '当前状态',
  stateNotInstalled: '未安装', stateInstalled: '已安装', stateUpdatable: '可更新',
  stageChecking: '校验环境', stageAuthorizing: '核验授权', stagePreparing: '安装到隔离环境',
  progress: '正在校验…', progressOf: '步骤', progressWait: '同一时间只允许一个安装操作。',
  restartTitle: '安装已完成，重启后生效', restartBody: '需要重启。', restartNow: '立即重启', restarting: '正在重启…',
  restartWaiting: '正在重启，请稍候…', restartDone: '已重启。', restartTimeout: '等待重启超时。',
  restartUnavailable: '当前形态不支持一键重启。', pending: '等待重启', uninstallAvailableHint: '重启前仍可卸载。',
  emptyInstalledTitle: '还没有安装任何能力', emptyInstalledHint: '从下面选择能力安装。', errorTitle: '暂时无法读取平台目录',
  noFallback: '不会切换到公共社区目录。', retryAction: '重试', refreshing: '正在刷新…', savedOk: '保存成功',
  restartSuccessToast: '已重启，新能力已生效。', failed: '操作未完成', confirm: '确认执行此插件操作？', installedVersion: '已装版本', updateTo: '可更新至',
  owned: '平台审核', community: '社区',
  search: '搜索能力', searchPlaceholder: '搜索能力名称、分类或说明', searchEmpty: '没有匹配的能力，换个词试试。',
}
const t = (key: string) => zh[key] ?? key

const ENTRY = {
  id: 'lawyer-mail', packageName: '@lawyer-dsh/lawyer-mail', name: '邮件管理', description: '绑定邮箱、读信、回信',
  category: '邮件', source: 'owned', hostVersions: ['0.1.5-rc.2'], version: '0.2.1', compatible: true,
}
const FILING = { ...ENTRY, id: 'lawyer-filing', packageName: '@lawyer-dsh/lawyer-filing', name: '立案材料与批次管理', description: '立案材料归档', category: '立案', version: '0.3.1' }

function stub(installed: unknown[], plugins: unknown[]) {
  vi.stubGlobal('fetch', vi.fn((input: unknown) => {
    const path = String(input).split('?')[0].replace(/^.*\/dsh-market\//, '/dsh-market/')
    const table: Record<string, unknown> = {
      '/dsh-market/installed': { installed, busy: false, stage: 'idle', restartRequired: false },
      '/dsh-market/status': { busy: false, stage: 'idle', restartRequired: false },
      '/dsh-market/registry': { revision: 1789206000000, plugins },
    }
    return Promise.resolve(new Response(JSON.stringify(table[path] ?? {}), { status: 200 }))
  }))
}

beforeEach(() => { sessionStorage.clear() })
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('律师能力列表', () => {
  it('装过东西时默认停在「已安装」，可安装列表收在另一个 tab', async () => {
    stub([{ id: 'lawyer-mail', packageName: '@entry/mail', version: '0.2.1' }], [ENTRY, FILING])
    render(<ManagedMarketSection t={t} />)
    await screen.findByRole('button', { name: '卸载' })
    expect(screen.queryByRole('button', { name: '安装' })).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: /可安装能力/ }))
    expect(await screen.findByRole('button', { name: '安装' })).toBeTruthy()
  })

  it('什么都没装时默认停在「可安装」，不让新用户面对空列表', async () => {
    stub([], [FILING])
    render(<ManagedMarketSection t={t} />)
    expect(await screen.findByRole('button', { name: '安装' })).toBeTruthy()
  })

  it('搜索按名称/分类过滤当前 tab，命中为空时给出换词提示', async () => {
    stub([], [ENTRY, FILING])
    render(<ManagedMarketSection t={t} />)
    await screen.findByText('邮件管理')
    const box = screen.getByRole('searchbox', { name: '搜索能力' })
    fireEvent.change(box, { target: { value: '立案' } })
    await waitFor(() => expect(screen.queryByText('邮件管理')).toBeNull())
    expect(screen.getByText('立案材料与批次管理')).toBeTruthy()
    fireEvent.change(box, { target: { value: '不存在的能力' } })
    expect(await screen.findByText('没有匹配的能力，换个词试试。')).toBeTruthy()
  })

  it('装了旧版本时，已安装栏里直接能点更新并标出「可更新」', async () => {
    stub([{ id: 'lawyer-mail', packageName: '@entry/mail', version: '0.2.0' }], [ENTRY])
    render(<ManagedMarketSection t={t} />)
    const update = await screen.findByRole('button', { name: '更新' })
    expect(update).toBeTruthy()
    expect(screen.getByText('可更新', { selector: 'span' })).toBeTruthy()
    expect(screen.getByText('已装版本 v0.2.0 · 可更新至 v0.2.1')).toBeTruthy()
  })

  it('已装版本永不贴上「当前版本」标签，目录版本只在可更新时以「可更新至」出现', async () => {
    stub([{ id: 'lawyer-mail', packageName: '@entry/mail', version: '0.2.0' }], [ENTRY])
    render(<ManagedMarketSection t={t} />)
    await screen.findByRole('button', { name: '更新' })
    expect(screen.queryByText(/当前版本/)).toBeNull()
    const meta = screen.getByText(/已装版本/).textContent ?? ''
    expect(meta.indexOf('已装版本')).toBeLessThan(meta.indexOf('可更新至'))
  })

  it('已装版本与目录一致时不重复报版本，只说已装 v0.2.1', async () => {
    stub([{ id: 'lawyer-mail', packageName: '@entry/mail', version: '0.2.1' }], [ENTRY])
    render(<ManagedMarketSection t={t} />)
    await screen.findByRole('button', { name: '卸载' })
    expect(screen.getByText('已装版本 v0.2.1')).toBeTruthy()
    expect(screen.queryByText(/可更新至/)).toBeNull()
    expect(screen.queryByRole('button', { name: '更新' })).toBeNull()
  })
})
