import { expect, test } from '@playwright/test'

const canvasStyle = {
    width: 375,
    height: 667,
    scale: 100,
    color: '#000',
    opacity: 1,
    backgroundColor: '#ffffff',
    fontSize: 14,
}

const component = {
    id: 'e2e-title',
    component: 'VText',
    label: '标题',
    icon: '',
    propValue: '端到端测试标题',
    style: {
        width: 280,
        height: 60,
        top: 40,
        left: 48,
        rotate: 0,
        opacity: 1,
        fontSize: 28,
        fontWeight: 700,
        color: '#111111',
        backgroundColor: 'transparent',
        textAlign: 'center',
    },
    parentId: null,
    slot: 'default',
    zIndex: 1,
    animations: [],
    events: {},
    groupStyle: {},
    isLock: false,
    collapseName: 'style',
    linkage: { duration: 0, data: [] },
}

test('AI preview applies to canvas and survives reload', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(async () => {
        localStorage.clear()
        await new Promise<void>((resolve, reject) => {
            const request = indexedDB.deleteDatabase('lowcode-platform')
            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
            request.onblocked = () => resolve()
        })
    })
    await page.reload()

    await page.route('**/api/ai/agent/round', async route => {
        const toolCall = {
            id: 'tool_e2e',
            type: 'tool_call',
            title: '添加标题',
            status: 'running',
            toolName: 'add_component',
            toolArgs: { component: 'VText', label: '标题' },
        }
        const toolResult = {
            id: 'result_tool_e2e',
            type: 'tool_result',
            title: '已完成: 添加标题',
            description: '已添加标题',
            status: 'success',
            preview: [component],
            canvasStyle,
        }
        const done = {
            sessionId: 'sess_e2e',
            steps: [{ ...toolCall, status: 'success' }, toolResult],
            preview: [component],
            canvasStyle,
            done: true,
            waitingForInput: false,
            currentDimension: '',
            progress: { currentStep: 1, totalSteps: 1, dimensions: [] },
        }
        const body = [
            `event: tool_call\ndata: ${JSON.stringify({ step: toolCall })}\n\n`,
            `event: tool_result\ndata: ${JSON.stringify({ step: toolResult })}\n\n`,
            `event: done\ndata: ${JSON.stringify(done)}\n\n`,
        ].join('')

        await route.fulfill({
            status: 200,
            contentType: 'text/event-stream; charset=utf-8',
            body,
        })
    })

    await page.getByRole('button', { name: 'AI 生成' }).click()
    const input = page.locator('.agent-input-area textarea')
    await input.fill('直接生成测试页面')
    await input.press('Enter')

    await expect(page.getByText('实时预览')).toBeVisible()
    await expect(page.locator('.agent-preview').getByText('端到端测试标题')).toBeVisible()
    await page.getByRole('button', { name: '应用到画布' }).click()

    await expect(page.locator('#editor').getByText('端到端测试标题')).toBeVisible()
    await page.waitForTimeout(3500)
    await page.reload()
    await expect(page.locator('#editor').getByText('端到端测试标题')).toBeVisible()
})
