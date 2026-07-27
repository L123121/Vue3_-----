import { BaseCommand, getContext } from './BaseCommand'
import { CommandType, type Command, type CommandEnvelope } from './types'
import { register } from './registry'
import type { ComponentData } from '@/types'
import decomposeComponent from '@/utils/decomposeComponent'
import { nanoid } from 'nanoid'

interface DecomposeData {
    groupId: string
    /** 撤销恢复所需快照 */
    groupComponent: ComponentData | null
    groupIndex: number
    /** 拆分出的子组件(首次 execute 基于 DOM 测量计算,后续复用) */
    subComponents: ComponentData[]
}

/**
 * 拆分命令
 *
 * 注意:execute 依赖 store.editor.getBoundingClientRect()(DOM 测量),
 * 因此把计算结果(subComponents 完整快照)写入 data。
 * 不重放命令,故 DOM 依赖不构成问题;
 * 跨会话恢复时直接用 data 中的 subComponents,无需重新测量。
 */
export class DecomposeCommand extends BaseCommand {
    type = CommandType.DECOMPOSE
    description = '拆分组合'
    mergeable = false

    private decomposeData: DecomposeData

    constructor(groupId: string) {
        super()
        this.id = nanoid()
        this.decomposeData = {
            groupId,
            groupComponent: null,
            groupIndex: -1,
            subComponents: [],
        }
        this.data = this.decomposeData as unknown as Record<string, unknown>
    }

    execute(): void {
        const ctx = getContext()
        const all = ctx.getAll()
        const groupIdx = all.findIndex(c => c.id === this.decomposeData.groupId)
        if (groupIdx === -1) return

        this.decomposeData.groupIndex = groupIdx
        this.decomposeData.groupComponent = structuredClone(all[groupIdx])

        // 首次执行:基于 DOM 测量计算 subComponents,写入 data 供后续复用
        if (this.decomposeData.subComponents.length === 0) {
            const parentStyle = { ...this.decomposeData.groupComponent.style }
            const components = this.decomposeData.groupComponent.propValue as ComponentData[]
            const editorRect = ctx.editorEl?.getBoundingClientRect()

            this.decomposeData.subComponents = components.map(component => {
                const newComp = structuredClone(component)
                // editorRect 可能为 null(无 DOM 环境),decomposeComponent 内部需容错
                if (editorRect) {
                    decomposeComponent(newComp, editorRect, parentStyle)
                }
                return newComp
            })
        }

        // 插入拆分出的子组件
        this.decomposeData.subComponents.forEach(comp => {
            ctx.insert(structuredClone(comp))
        })

        // 删除组合组件
        ctx.removeAt(groupIdx)

        this.data = { ...this.decomposeData } as unknown as Record<string, unknown>
    }

    undo(): void {
        const ctx = getContext()

        // 删除拆分出来的组件
        this.decomposeData.subComponents.forEach(comp => {
            ctx.remove(comp.id)
        })

        // 恢复组合组件
        if (this.decomposeData.groupComponent) {
            ctx.insert(structuredClone(this.decomposeData.groupComponent), this.decomposeData.groupIndex)
        }
    }

    canMergeWith(): boolean {
        return false
    }

    merge(other: Command): Command {
        return other
    }
}

register(CommandType.DECOMPOSE, (env: CommandEnvelope) => {
    const d = env.data as unknown as DecomposeData
    const cmd = new DecomposeCommand(d.groupId)
    cmd.id = env.id
    ;(cmd as unknown as { decomposeData: DecomposeData }).decomposeData = {
        groupId: d.groupId,
        groupComponent: d.groupComponent ? structuredClone(d.groupComponent) : null,
        groupIndex: d.groupIndex,
        subComponents: (d.subComponents ?? []).map(c => structuredClone(c)),
    }
    cmd.data = (cmd as unknown as { decomposeData: DecomposeData }).decomposeData as unknown as Record<string, unknown>
    return cmd
})
