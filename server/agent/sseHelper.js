/**
 * SSE（Server-Sent Events）流式写入工具
 * 统一管理 agent 的 SSE 事件推送，消除路由层重复的 write 逻辑
 */

/**
 * 初始化 SSE 响应头
 * @param {import('express').Response} res
 */
export function initSSE(res) {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
    })
    res.flushHeaders?.()
}

/**
 * 写入一条 SSE 事件
 * @param {import('express').Response} res
 * @param {string} event — 事件名
 * @param {object} data — 数据对象（自动 JSON 序列化）
 */
export function writeSSE(res, event, data) {
    if (res.destroyed || res.writableEnded) return
    res.write(`event: ${event}\n`)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
}

/**
 * 创建 SSE send 函数（绑定到 Express response）
 * @param {import('express').Response} res
 * @returns {(event:string, data:object) => void}
 */
export function createSSESender(res) {
    return (event, data) => writeSSE(res, event, data)
}

/**
 * 创建 AbortController 并绑定到 response 的 close 事件
 * @param {import('express').Response} res
 * @param {AbortController} controller
 * @returns {() => void} cleanup 函数
 */
export function bindAbortOnClose(res, controller) {
    const abort = () => {
        if (!res.writableEnded) controller.abort()
    }
    res.once('close', abort)
    return () => res.off('close', abort)
}
