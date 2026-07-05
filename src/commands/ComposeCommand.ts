import { BaseCommand, getContext } from './BaseCommand'
import { CommandType, type Command, type CommandEnvelope } from './types'
import { register } from './registry'
import type { ComponentData, ComponentStyle } from '@/types'
import { createGroupStyle } from '@/utils/style'
import generateID from '@/utils/generateID'
import { nanoid } from 'nanoid'

interface ComposeData {
    componentIds: string[]
    /** 首次执行创建的组合组件(固定 id) */
    groupComponent: ComponentData | null
    originalComponents: ComponentData[]
    originalIndices: number[]
}

/**
 * 组合命令
 */
export class ComposeCommand extends BaseCommand {
    type = CommandType.COMPOSE
    description = '组合组件'
    mergeable = false

    private composeData: ComposeData

    constructor(componentIds: string[]) {
        super()
        this.id = nanoid()
        this.composeData = {
            componentIds: [...componentIds],
            groupComponent: null,
            originalComponents: [],
            originalIndices: [],
        }
        this.data = this.composeData as unknown as Record<string, unknown>
    }

    execute(): void {
        const ctx = getContext()
        const all = ctx.getAll()

        // 收集要组合的组件(首次执行)
        if (this.composeData.groupComponent === null) {
            this.composeData.originalComponents = []
            this.composeData.originalIndices = []

            const components: ComponentData[] = []
            this.composeData.componentIds.forEach(id => {
                const idx = all.findIndex(c => c.id === id)
                if (idx !== -1) {
                    this.composeData.originalIndices.push(idx)
                    const comp = all[idx]
                    this.composeData.originalComponents.push(structuredClone(comp))
                    components.push(comp)
                }
            })

            this.composeData.groupComponent = {
                id: generateID(),
                component: 'Group',
                label: '组合',
                icon: 'qunzu',
                style: { ...this.calculateGroupBounds(components) } as ComponentStyle,
                propValue: components.map(c => structuredClone(c)),
                animations: [],
                events: {},
                groupStyle: {},
                isLock: false,
                collapseName: 'style',
                parentId: null,
                slot: 'default',
                zIndex: 0,
                linkage: {
                    duration: 0,
                    data: [{ id: '', label: '', event: '', style: [{ key: '', value: '' }] }],
                },
            }

            createGroupStyle(this.composeData.groupComponent)
        }

        // 删除原有组件
        this.composeData.componentIds.forEach(id => {
            ctx.remove(id)
        })

        // 添加组合组件
        ctx.insert(this.composeData.groupComponent)
        ctx.setCurComponent(this.composeData.groupComponent.id)

        this.data = { ...this.composeData } as unknown as Record<string, unknown>
    }

    undo(): void {
        const ctx = getContext()
        if (!this.composeData.groupComponent) return

        // 删除组合组件
        ctx.remove(this.composeData.groupComponent.id)

        // 恢复原有组件
        this.composeData.originalComponents.forEach((comp, i) => {
            ctx.insert(structuredClone(comp), this.composeData.originalIndices[i])
        })
    }

    private calculateGroupBounds(components: ComponentData[]): Partial<ComponentStyle> {
        let minTop = Infinity,
            minLeft = Infinity
        let maxBottom = -Infinity,
            maxRight = -Infinity

        components.forEach(comp => {
            const top = comp.style.top ?? 0
            const left = comp.style.left ?? 0
            minTop = Math.min(minTop, top)
            minLeft = Math.min(minLeft, left)
            maxBottom = Math.max(maxBottom, top + (comp.style.height ?? 0))
            maxRight = Math.max(maxRight, left + (comp.style.width ?? 0))
        })

        return {
            top: minTop,
            left: minLeft,
            width: maxRight - minLeft,
            height: maxBottom - minTop,
            rotate: 0,
            opacity: 1,
        }
    }

    canMergeWith(): boolean {
        return false
    }

    merge(other: Command): Command {
        return other
    }
}

register(CommandType.COMPOSE, (env: CommandEnvelope) => {
    const d = env.data as unknown as ComposeData
    const cmd = new ComposeCommand(d.componentIds)
    cmd.id = env.id
    ;(cmd as unknown as { composeData: ComposeData }).composeData = {
        componentIds: [...d.componentIds],
        groupComponent: d.groupComponent ? structuredClone(d.groupComponent) : null,
        originalComponents: (d.originalComponents ?? []).map(c => structuredClone(c)),
        originalIndices: [...(d.originalIndices ?? [])],
    }
    cmd.data = (cmd as unknown as { composeData: ComposeData }).composeData as unknown as Record<string, unknown>
    return cmd
})
