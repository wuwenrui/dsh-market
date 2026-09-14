// @vitest-environment jsdom
/**
 * 「模型服务」区块规格：模型能力（收不收图片、上下文窗口）必须能在界面上配置。
 *
 * 背景（2026-09-12 线上问题）：会话模型没声明 input 模态时，内核按「不支持图片」
 * 拒绝附件，前端只弹一句「当前模型不支持图片」——而设置页当时没有任何地方能声明
 * 这件事，只能手改 settings.yaml。这个区块就是把那份声明搬到界面上：
 * 1. 逐个模型勾选「支持图片」、填「上下文窗口」；
 * 2. 保存走 /dsh-market/save-models，提交的正是界面上的声明；
 * 3. 服务端拒绝（模型不在本站开放清单）时把原因显示出来，不假装成功。
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ManagedModelsSection } from '../../src/client/ManagedMarket.tsx'

const zh = {
  models: '模型服务', fixed: '模型服务由平台统一提供，不支持添加其他模型站。', site: '我们的模型站', account: '账户与充值',
  key: '本站 API 令牌', save: '保存令牌', saved: '令牌已保存，可刷新可用模型。', refresh: '刷新可用模型',
  select: '默认模型', choose: '保存默认模型', configured: '已配置本站令牌', missing: '尚未配置本站令牌',
  readonly: '令牌由启动环境提供，请在启动环境中更新。', savedModel: '默认模型已更新，新对话生效。',
  savedOk: '保存成功', none: '暂无模型，请先配置本站令牌并刷新。', selected: '当前默认模型',
  visionTitle: '模型能力', visionHint: '勾选「支持图片」表示这个模型能直接看图。', visionField: '支持图片',
  visionOn: '可看图', visionOff: '仅文字', visionDefault: '默认', saveModels: '保存模型设置',
  contextField: '上下文窗口', contextUnit: 'tokens', contextHint: '留空表示用默认值。',
  contextInvalid: '上下文窗口要填正整数（单位 token），或留空用默认值。',
  savedModels: '模型设置已保存，新对话生效。', modelCount: '本站已开放', modelSelected: '当前默认',
}
const t = (key: string) => zh[key as keyof typeof zh] ?? key

let calls: Array<{ path: string; method: string; body: unknown }> = []
function stubFetch(saveResult: unknown = null, override: { models?: unknown[] } = {}) {
  calls = []
  const models = {
    site: 'https://model.codingrui.work', configured: true, writable: true, selected: 'gpt-5.6-luna',
    models: override.models ?? [
      { id: 'gpt-5.6-luna', name: 'gpt-5.6-luna', vision: false, contextWindow: 262144 },
      { id: 'gpt-5.6-vision', name: 'gpt-5.6-vision', vision: true, contextWindow: 262144 },
    ],
  }
  const response = { ...models, models: models.models.map(model => ({ ...model, vision: model.id === 'gpt-5.6-luna' ? true : model.vision })) }
  const mock = vi.fn((input: unknown, init?: RequestInit) => {
    const path = String(input).split('?')[0].replace(/^.*\/dsh-market\//, '/dsh-market/')
    const method = (init?.method ?? 'GET').toUpperCase()
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ path, method, body })
    const table: Record<string, unknown> = {
      '/dsh-market/models': path === '/dsh-market/models' && method === 'GET' ? models : saveResult ?? response,
      '/dsh-market/save-models': saveResult ?? response,
    }
    const payload = table[path]
    if (payload === undefined) return Promise.reject(new Error(`unstubbed fetch: ${path}`))
    const refused = payload !== null && typeof payload === 'object' && '__status' in payload
    const status = refused ? Number((payload as { __status: number }).__status) : 200
    return Promise.resolve(new Response(JSON.stringify(payload), { status }))
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

beforeEach(() => { sessionStorage.clear() })
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('模型能力设置', () => {
  it('列出本站模型并标出各自的图片能力与默认模型', async () => {
    stubFetch()
    render(<ManagedModelsSection t={t} />)

    await screen.findByText('模型能力')
    // 「gpt-5.6-luna」在下拉框和清单里各出现一次，用角色定位而不是纯文本匹配
    const boxes = (await screen.findAllByRole('checkbox')) as HTMLInputElement[]
    expect(boxes).toHaveLength(2)
    const labels = boxes.map(box => box.closest('label')?.textContent ?? '')
    expect(labels[0]).toContain('gpt-5.6-luna')
    expect(labels[0]).toContain('仅文字')
    expect(labels[0]).toContain('当前默认')
    expect(labels[1]).toContain('gpt-5.6-vision')
    expect(labels[1]).toContain('可看图')
    // 勾选状态就是运行时解析出来的模态
    expect(boxes[0].checked).toBe(false)
    expect(boxes[1].checked).toBe(true)
  })

  it('勾选后保存：把每个模型的图片能力原样提交给宿主', async () => {
    stubFetch()
    render(<ManagedModelsSection t={t} />)
    const boxes = (await screen.findAllByRole('checkbox')) as HTMLInputElement[]
    fireEvent.click(boxes[0])
    expect(boxes[0].checked).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: '保存模型设置' }))
    await screen.findByText('模型设置已保存，新对话生效。')
    const saved = calls.find(call => call.path === '/dsh-market/save-models')
    expect(saved?.method).toBe('POST')
    expect(saved?.body).toEqual({ models: [
      { id: 'gpt-5.6-luna', name: 'gpt-5.6-luna', vision: true },
      { id: 'gpt-5.6-vision', name: 'gpt-5.6-vision', vision: true },
    ] })
  })

  it('宿主拒绝时显示原因，不假装保存成功', async () => {
    stubFetch({ error: '模型「gpt-5.6-luna」不在本站已开放的清单里，请先刷新可用模型', __status: 400 })
    render(<ManagedModelsSection t={t} />)
    await screen.findAllByRole('checkbox')
    fireEvent.click(screen.getByRole('button', { name: '保存模型设置' }))

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('不在本站已开放的清单里'))
    expect(screen.queryByText('模型设置已保存，新对话生效。')).toBeNull()
  })
})

/**
 * 上下文窗口规格：内核按 contextWindow 判上下文溢出，用户必须能在界面上改。
 * 两条不能破的语义：
 * 1. 输入框里只放「用户自己声明过的那份值」，生效默认值只做占位提示——
 *    把默认值当成用户声明回写，等于给每个模型钉死一个再也不会跟着默认值走的值；
 * 2. 留空 = 不声明（回落默认），保存时该字段必须消失，而不是被写成 0/NaN。
 */
describe('上下文窗口设置', () => {
  it('用户声明过的模型预填输入框，未声明的只显示当前生效值做占位', async () => {
    stubFetch(null, { models: [
      { id: 'gpt-5.6-luna', name: 'gpt-5.6-luna', vision: true, contextWindow: 262144, contextWindowOverride: 131072 },
      { id: 'gpt-5.6-vision', name: 'gpt-5.6-vision', vision: true, contextWindow: 262144 },
    ] })
    render(<ManagedModelsSection t={t} />)
    const inputs = (await screen.findAllByRole('spinbutton')) as HTMLInputElement[]
    expect(inputs).toHaveLength(2)
    expect(inputs[0].value).toBe('131072')
    expect(inputs[1].value).toBe('')
    expect(inputs[1].placeholder).toBe('262144')
  })

  it('填了上下文窗口就原样提交，留空的模型不提交该字段', async () => {
    stubFetch()
    render(<ManagedModelsSection t={t} />)
    const inputs = (await screen.findAllByRole('spinbutton')) as HTMLInputElement[]
    fireEvent.change(inputs[0], { target: { value: '32768' } })

    fireEvent.click(screen.getByRole('button', { name: '保存模型设置' }))
    await screen.findByText('模型设置已保存，新对话生效。')
    const saved = calls.find(call => call.path === '/dsh-market/save-models')
    expect(saved?.body).toEqual({ models: [
      { id: 'gpt-5.6-luna', name: 'gpt-5.6-luna', vision: false, contextWindow: 32768 },
      { id: 'gpt-5.6-vision', name: 'gpt-5.6-vision', vision: true },
    ] })
  })

  it('非法上下文窗口在本地拦下，不发请求也不假装保存成功', async () => {
    stubFetch()
    render(<ManagedModelsSection t={t} />)
    const inputs = (await screen.findAllByRole('spinbutton')) as HTMLInputElement[]
    fireEvent.change(inputs[0], { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: '保存模型设置' }))

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('上下文窗口要填正整数'))
    expect(calls.some(call => call.path === '/dsh-market/save-models')).toBe(false)
    expect(screen.queryByText('模型设置已保存，新对话生效。')).toBeNull()
  })
})
