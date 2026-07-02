/**
 * Yjs 协同服务端 - 最小 WebSocket 中继
 *
 * 兼容 y-websocket 客户端协议:
 *   messageSync = 0          (Yjs 文档同步)
 *   messageAwareness = 1     (光标/选区/在线状态)
 *   messageAuth = 2
 *   messageQueryAwareness = 3
 *
 * 每个房间(roomName)维护一个独立的 Y.Doc,所有同房间连接共享。
 * 启动: npm run server  (默认端口 1234)
 */

import { WebSocketServer } from 'ws'
import http from 'http'
import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'

const port = Number(process.env.PORT) || 1234

const messageSync = 0
const messageQueryAwareness = 3
const messageAwareness = 1

// roomName -> { doc: Y.Doc, awareness: Awareness, connections: Set<ws> }
const docs = new Map()

function getDoc(roomName) {
    let entry = docs.get(roomName)
    if (!entry) {
        const doc = new Y.Doc()
        // Awareness 实例:承载光标/选区/在线状态,clientID 用 doc.clientID
        const awareness = new awarenessProtocol.Awareness(doc)
        entry = { doc, awareness, connections: new Set() }
        docs.set(roomName, entry)
    }
    return entry
}

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('Yjs collaboration server is running\n')
})

const wss = new WebSocketServer({ server })

wss.on('connection', (conn, req) => {
    // 从 URL 提取房间名: ws://host/room-<id>  →  room-<id>
    const url = new URL(req.url, `http://${req.headers.host}`)
    const roomName = url.pathname.replace(/^\//, '') || 'default'
    const { doc, awareness, connections } = getDoc(roomName)

    connections.add(conn)
    conn.binaryType = 'arraybuffer'

    // 同步:把当前 Y.Doc 状态发给新连接(step1),并请求对方的增量(step2)
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, messageSync)
    syncProtocol.writeSyncStep1(encoder, doc)
    syncProtocol.writeSyncStep2(encoder, doc)
    send(conn, encoding.toUint8Array(encoder))

    // awareness:把现有在线状态发给新连接
    const awarenessStates = Array.from(awareness.states.keys())
    if (awarenessStates.length > 0) {
        const ae = encoding.createEncoder()
        encoding.writeVarUint(ae, messageAwareness)
        encoding.writeVarUint8Array(
            ae,
            awarenessProtocol.encodeAwarenessUpdate(awareness, awarenessStates),
        )
        send(conn, encoding.toUint8Array(ae))
    }

    conn.on('message', (data) => {
        try {
            const decoder = decoding.createDecoder(new Uint8Array(data))
            const messageType = decoding.readVarUint(decoder)
            const encoder = encoding.createEncoder()

            switch (messageType) {
                case messageSync: {
                    encoding.writeVarUint(encoder, messageSync)
                    syncProtocol.readSyncMessage(decoder, encoder, doc, conn)
                    // 若 encoder 有响应,回传给发送者
                    const response = encoding.toUint8Array(encoder)
                    if (response.length > 1) send(conn, response)
                    // 广播增量更新给同房间其他连接
                    broadcastConnections(doc, roomName, data, conn)
                    break
                }
                case messageQueryAwareness: {
                    encoding.writeVarUint(encoder, messageAwareness)
                    encoding.writeVarUint8Array(
                        encoder,
                        awarenessProtocol.encodeAwarenessUpdate(
                            awareness,
                            Array.from(awareness.states.keys()),
                        ),
                    )
                    send(conn, encoding.toUint8Array(encoder))
                    break
                }
                case messageAwareness: {
                    awarenessProtocol.applyAwarenessUpdate(
                        awareness,
                        decoding.readVarUint8Array(decoder),
                        conn,
                    )
                    broadcastConnections(doc, roomName, data, conn)
                    break
                }
                default:
                    // 未知消息类型,忽略
                    break
            }
        } catch (err) {
            console.error('[yjs-server] 处理消息失败:', err)
        }
    })

    conn.on('close', () => {
        connections.delete(conn)
        // awareness 清理:依赖客户端 awareness 超时机制
        // (每个 WebsocketProvider 有 awarenessTimeout,收不到对方心跳即判定离线,无需服务端主动清)
        if (connections.size === 0) {
            // 房间无人,销毁 doc 与 awareness 释放内存
            doc.destroy()
            awareness.destroy()
            docs.delete(roomName)
        }
    })
})

function send(conn, uint8) {
    if (conn.readyState === conn.OPEN) {
        conn.send(uint8)
    }
}

function broadcastConnections(doc, roomName, data, excludeConn) {
    const { connections } = getDoc(roomName)
    for (const c of connections) {
        if (c !== excludeConn && c.readyState === c.OPEN) {
            c.send(data)
        }
    }
}

server.listen(port, () => {
    console.log(`✅ Yjs 协同服务已启动: ws://localhost:${port}/<room-name>`)
})
