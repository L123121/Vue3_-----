/**
 * Yjs WebSocket 协同 - 可复用的 setup 函数
 *
 * 用法:
 *   import { setupYjsWebSocket } from './yjs-ws.js'
 *   const wss = new WebSocketServer({ server })
 *   setupYjsWebSocket(wss)
 */

import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'

const messageSync = 0
const messageQueryAwareness = 3
const messageAwareness = 1

// roomName -> { doc: Y.Doc, awareness: Awareness, connections: Set<ws> }
const docs = new Map()

function getDoc(roomName) {
    let entry = docs.get(roomName)
    if (!entry) {
        const doc = new Y.Doc()
        const awareness = new awarenessProtocol.Awareness(doc)
        entry = { doc, awareness, connections: new Set() }
        docs.set(roomName, entry)
    }
    return entry
}

function send(conn, uint8) {
    if (conn.readyState === conn.OPEN) {
        conn.send(uint8)
    }
}

function broadcastConnections(roomName, data, excludeConn) {
    const { connections } = getDoc(roomName)
    for (const c of connections) {
        if (c !== excludeConn && c.readyState === c.OPEN) {
            c.send(data)
        }
    }
}

export function setupYjsWebSocket(wss) {
    wss.on('connection', (conn, req) => {
        // 从 URL 提取房间名
        const url = new URL(req.url, `http://${req.headers.host}`)
        const roomName = url.pathname.replace(/^\//, '').replace(/^ws\//, '') || 'default'
        const { doc, awareness, connections } = getDoc(roomName)

        connections.add(conn)
        conn.binaryType = 'arraybuffer'

        // 同步步骤1+2:发送完整文档状态
        const encoder = encoding.createEncoder()
        encoding.writeVarUint(encoder, messageSync)
        syncProtocol.writeSyncStep1(encoder, doc)
        syncProtocol.writeSyncStep2(encoder, doc)
        send(conn, encoding.toUint8Array(encoder))

        // 发送现有 awareness 状态
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
                        const response = encoding.toUint8Array(encoder)
                        if (response.length > 1) send(conn, response)
                        broadcastConnections(roomName, data, conn)
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
                        broadcastConnections(roomName, data, conn)
                        break
                    }
                    default:
                        break
                }
            } catch (err) {
                console.error('[yjs-ws] 处理消息失败:', err)
            }
        })

        conn.on('close', () => {
            connections.delete(conn)
            if (connections.size === 0) {
                doc.destroy()
                awareness.destroy()
                docs.delete(roomName)
            }
        })
    })
}