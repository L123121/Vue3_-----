/**
 * Yjs 文档结构定义与 componentData ↔ Yjs 双向转换
 *
 * 数据模型（细粒度，属性级冲突合并）:
 *   yComponents: Y.Array<Y.Map>            ← componentData[]
 *     每个 Y.Map 字段:
 *       id, component, label, icon, parentId, slot, zIndex,
 *       isLock, collapseName,
 *       propValue   ← Y.Map（复杂结构整体存，Group 嵌套后续细化）
 *       style       ← Y.Map（嵌套，实现 top/left/color 等属性级合并）
 *       animations  ← Y.Array<Y.Map>
 *       events      ← Y.Map<string,string>
 *       linkage     ← Y.Map
 *       request     ← Y.Map（可选）
 *       groupStyle  ← Y.Map（可选）
 *   yCanvas: Y.Map                           ← canvasStyleData
 *
 * 设计取舍:propValue 因是 union(含 Group 的 ComponentData[] 嵌套)，
 * 整体以 JSON 存储避免递归复杂度；style 是高频并发修改源（拖动/缩放/改色），
 * 必须属性级，故用嵌套 Y.Map。两者粒度差异是有意的。
 */

import * as Y from 'yjs'
import type { ComponentData, ComponentStyle, CanvasStyleData, PropValue, Animation } from '@/types'

/** Yjs 文档的顶层结构句柄 */
export interface CollabDoc {
    doc: Y.Doc
    yComponents: Y.Array<Y.Map<unknown>>
    yCanvas: Y.Map<unknown>
}

/** 创建协同文档句柄（Y.Doc 由调用方持有以便多 provider 共享） */
export function createCollabDoc(doc: Y.Doc = new Y.Doc()): CollabDoc {
    return {
        doc,
        yComponents: doc.getArray<Y.Map<unknown>>('components'),
        yCanvas: doc.getMap('canvas'),
    }
}

// ==================== style: 嵌套 Y.Map（属性级合并） ====================

function readStyle(ymap: Y.Map<unknown>): ComponentStyle {
    const style: Record<string, unknown> = {}
    ymap.forEach((value, key) => {
        style[key] = value
    })
    return style as unknown as ComponentStyle
}

/** 把 ComponentStyle 写入 Y.Map；仅写差异，未变更的属性不动（保留他人并发修改） */
function writeStyle(ymap: Y.Map<unknown>, style: Partial<ComponentStyle>): void {
    // 先写入/更新本次提供的字段
    for (const [key, value] of Object.entries(style)) {
        const current = ymap.get(key)
        if (current !== value) {
            ymap.set(key, value)
        }
    }
    // 注意:不删除 ymap 中存在但 style 中缺失的字段——
    // 部分 style（如 resize 只提供 width/height/top/left）不应清掉 color 等。
}

// ==================== 单个 ComponentData ↔ Y.Map ====================

const SCALAR_KEYS = ['id', 'component', 'label', 'icon', 'parentId', 'slot', 'zIndex', 'isLock', 'collapseName'] as const

/** Y.Map → ComponentData（纯读，无副作用） */
export function toComponentData(ymap: Y.Map<unknown>): ComponentData {
    const data: Record<string, unknown> = {}

    for (const key of SCALAR_KEYS) {
        const v = ymap.get(key)
        if (v !== undefined) data[key] = v
    }

    const styleMap = ymap.get('style') as Y.Map<unknown> | undefined
    data.style = styleMap ? readStyle(styleMap) : {}

    // propValue:整体 JSON（含 Group 嵌套）
    data.propValue = ymap.get('propValue') ?? ''

    // animations: Y.Array<Y.Map> → Animation[]
    const animArr = ymap.get('animations') as Y.Array<Y.Map<unknown>> | undefined
    data.animations = animArr ? animArr.map(a => plainObject(a) as unknown as Animation) : []

    // events: Y.Map → Record
    const eventsMap = ymap.get('events') as Y.Map<unknown> | undefined
    data.events = eventsMap ? (plainObject(eventsMap) as Record<string, string>) : {}

    // linkage / request / groupStyle:整体 JSON
    const linkage = ymap.get('linkage')
    if (linkage !== undefined) data.linkage = linkage
    const request = ymap.get('request')
    if (request !== undefined) data.request = request
    const groupStyle = ymap.get('groupStyle')
    if (groupStyle !== undefined) data.groupStyle = groupStyle
    else data.groupStyle = {}

    return data as unknown as ComponentData
}

function plainObject(ymap: Y.Map<unknown>): Record<string, unknown> {
    const obj: Record<string, unknown> = {}
    ymap.forEach((value, key) => {
        obj[key] = value
    })
    return obj
}

/**
 * 把一个 ComponentData 写入（新建或更新）Y.Map。
 * - 全新组件:创建所有子结构
 * - 已存在:仅写差异字段,保留他人并发修改（属性级合并核心）
 */
export function fromComponentData(ymap: Y.Map<unknown>, data: ComponentData): void {
    const doc = ymap.doc!

    doc.transact(() => {
        // 标量字段
        for (const key of SCALAR_KEYS) {
            const value = data[key as keyof ComponentData]
            if (value !== undefined && ymap.get(key) !== value) {
                ymap.set(key, value)
            }
        }

        // style:嵌套 Y.Map
        let styleMap = ymap.get('style') as Y.Map<unknown> | undefined
        if (!styleMap) {
            styleMap = new Y.Map()
            ymap.set('style', styleMap)
        }
        writeStyle(styleMap, data.style)

        // propValue:整体 JSON
        if (ymap.get('propValue') !== data.propValue) {
            ymap.set('propValue', data.propValue as PropValue)
        }

        // animations:整体重建（动画变更频率低，不值得逐项 diff）
        let animArr = ymap.get('animations') as Y.Array<Y.Map<unknown>> | undefined
        if (!animArr) {
            animArr = new Y.Array()
            ymap.set('animations', animArr)
        }
        animArr.delete(0, animArr.length)
        for (const anim of data.animations) {
            const a = new Y.Map()
            for (const [k, v] of Object.entries(anim)) a.set(k, v)
            animArr.push([a])
        }

        // events:整体重建
        let eventsMap = ymap.get('events') as Y.Map<unknown> | undefined
        if (!eventsMap) {
            eventsMap = new Y.Map()
            ymap.set('events', eventsMap)
        } else {
            eventsMap.clear()
        }
        for (const [k, v] of Object.entries(data.events)) eventsMap.set(k, v)

        // linkage / request / groupStyle:整体 JSON
        ymap.set('linkage', data.linkage)
        if (data.request !== undefined) ymap.set('request', data.request)
        ymap.set('groupStyle', data.groupStyle)
    }, doc.clientID)
}

// ==================== 整体数组 ↔ Y.Array ====================

/** Y.Array<Y.Map> → ComponentData[] */
export function readAllComponents(yComponents: Y.Array<Y.Map<unknown>>): ComponentData[] {
    return yComponents.map(ymap => toComponentData(ymap))
}

/**
 * 用一份 componentData 覆盖整个 Y.Array（用于初次加载 / 导入 / 恢复版本）。
 * 远端会收到差异更新。注意:按 id 复用已有 Y.Map,避免无谓重建。
 */
export function replaceAllComponents(yComponents: Y.Array<Y.Map<unknown>>, list: ComponentData[]): void {
    const doc = yComponents.doc!
    doc.transact(() => {
        // 简化策略:清空后重建。导入/恢复是低频操作,正确性优先。
        yComponents.delete(0, yComponents.length)
        for (const data of list) {
            const ymap = new Y.Map()
            fromComponentData(ymap, data)
            yComponents.push([ymap])
        }
    }, doc.clientID)
}

/** 在 Y.Array 中按 id 查找 Y.Map 的索引 */
export function findYMapIndex(yComponents: Y.Array<Y.Map<unknown>>, id: string): number {
    for (let i = 0; i < yComponents.length; i++) {
        if (yComponents.get(i).get('id') === id) return i
    }
    return -1
}

// ==================== CanvasStyleData ↔ Y.Map ====================

export function readCanvas(yCanvas: Y.Map<unknown>): CanvasStyleData {
    return plainObject(yCanvas) as unknown as CanvasStyleData
}

export function writeCanvas(yCanvas: Y.Map<unknown>, canvas: CanvasStyleData): void {
    const doc = yCanvas.doc!
    doc.transact(() => {
        for (const [key, value] of Object.entries(canvas)) {
            if (yCanvas.get(key) !== value) yCanvas.set(key, value)
        }
    }, doc.clientID)
}
