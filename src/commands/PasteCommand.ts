import { BaseCommand, getContext } from './BaseCommand'
import { CommandType, type Command, type CommandEnvelope } from './types'
import { register } from './registry'
import type { ComponentData } from '@/types'
import generateID from '@/utils/generateID'
import { nanoid } from 'nanoid'

function cloneComponent(component: ComponentData): ComponentData {
    return structuredClone(component)
}

interface PasteData {
    sourceComponent: ComponentData
    isMouse?: boolean
    menuTop?: number
    menuLeft?: number
    /** 首次执行生成的实体(含固定 id),跨会话恢复时复用 */
    pastedComponent: ComponentData | null
}

/**
 * 粘贴命令
 */
export class PasteCommand extends BaseCommand {
    type = CommandType.PASTE
    description = '粘贴组件'
    mergeable = false

    private pasteData: PasteData

    constructor(
        sourceComponent: ComponentData,
        isMouse?: boolean,
        menuTop?: number,
        menuLeft?: number,
    ) {
        super()
        this.id = nanoid()
        this.pasteData = {
            sourceComponent: cloneComponent(sourceComponent),
            isMouse,
            menuTop,
            menuLeft,
            pastedComponent: null,
        }
        this.data = this.pasteData as unknown as Record<string, unknown>
    }

    private buildPastedComponent(): ComponentData {
        const component = cloneComponent(this.pasteData.sourceComponent)
        component.id = generateID()

        if (this.pasteData.isMouse && this.pasteData.menuTop !== undefined && this.pasteData.menuLeft !== undefined) {
            component.style.top = this.pasteData.menuTop
            component.style.left = this.pasteData.menuLeft
        } else {
            component.style.top = (component.style.top ?? 0) + 10
            component.style.left = (component.style.left ?? 0) + 10
        }

        if (component.component === 'Group') {
            (component.propValue as ComponentData[]).forEach(comp => {
                comp.id = generateID()
            })
        }

        return component
    }

    execute(): void {
        const ctx = getContext()
        // 首次执行生成实体(固定 id),重做/跨会话恢复时复用,保证 id 稳定
        if (!this.pasteData.pastedComponent) {
            this.pasteData.pastedComponent = this.buildPastedComponent()
            this.data = { ...this.pasteData } as unknown as Record<string, unknown>
        }

        ctx.insert(this.pasteData.pastedComponent)
        ctx.setCurComponent(this.pasteData.pastedComponent.id)
    }

    undo(): void {
        const ctx = getContext()
        if (!this.pasteData.pastedComponent) return
        ctx.remove(this.pasteData.pastedComponent.id)
    }

    canMergeWith(): boolean {
        return false
    }

    merge(other: Command): Command {
        return other
    }
}

register(CommandType.PASTE, (env: CommandEnvelope) => {
    const d = env.data as unknown as PasteData
    const cmd = new PasteCommand(d.sourceComponent, d.isMouse, d.menuTop, d.menuLeft)
    cmd.id = env.id
    // 恢复首次执行生成的实体(固定 id)
    ;(cmd as unknown as { pasteData: PasteData }).pasteData = {
        ...d,
        sourceComponent: d.sourceComponent,
        pastedComponent: d.pastedComponent ? structuredClone(d.pastedComponent) : null,
    }
    cmd.data = (cmd as unknown as { pasteData: PasteData }).pasteData as unknown as Record<string, unknown>
    return cmd
})
