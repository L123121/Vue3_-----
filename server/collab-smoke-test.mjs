// 协同冒烟测试:两个客户端连同一房间,验证 style 属性级同步
// 运行: node server/collab-smoke-test.mjs  (需先启动 npm run server)

import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const WS_URL = 'ws://localhost:1234'
const ROOM = 'smoke-test-' + Date.now()

function makeClient(name) {
    const doc = new Y.Doc()
    const yComponents = doc.getArray('components')
    const provider = new WebsocketProvider(WS_URL, ROOM, doc)
    return { doc, yComponents, provider, name }
}

const A = makeClient('A')
const B = makeClient('B')

let resolved = false
const timeout = setTimeout(() => {
    if (!resolved) {
        console.error('❌ 超时:B 未收到 A 的更新')
        process.exit(1)
    }
}, 5000)

// 等 B 同步完成后,在 A 上写入一个组件
B.provider.once('synced', () => {
    // 等一小会儿确保双方都 synced
    setTimeout(() => {
        A.doc.transact(() => {
            const comp = new Y.Map()
            const style = new Y.Map()
            style.set('top', 100)
            style.set('left', 200)
            comp.set('id', 'comp-1')
            comp.set('component', 'VText')
            comp.set('style', style)
            A.yComponents.push([comp])
        }, A.doc.clientID)
    }, 200)
})

// B 监听变更
B.yComponents.observeDeep(() => {
    if (B.yComponents.length > 0) {
        const comp = B.yComponents.get(0)
        const style = comp.get('style')
        if (style && style.get('top') === 100) {
            console.log('✅ 协同同步成功:B 收到 A 写入的组件')
            console.log(`   组件 id=${comp.get('id')}, top=${style.get('top')}, left=${style.get('left')}`)
            resolved = true
            clearTimeout(timeout)

            // 再验证属性级:A 改 top,B 收到新 top 但 left 不变
            A.doc.transact(() => {
                comp.get('style').set('top', 500)
            }, A.doc.clientID)

            setTimeout(() => {
                const bStyle = B.yComponents.get(0).get('style')
                if (bStyle.get('top') === 500 && bStyle.get('left') === 200) {
                    console.log('✅ 属性级合并验证:A 改 top,B 的 top 更新且 left 不变')
                    console.log(`   top=${bStyle.get('top')}, left=${bStyle.get('left')}`)
                    A.provider.destroy()
                    B.provider.destroy()
                    process.exit(0)
                } else {
                    console.error('❌ 属性级合并失败:', bStyle.get('top'), bStyle.get('left'))
                    process.exit(1)
                }
            }, 500)
        }
    }
})
