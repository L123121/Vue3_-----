import { BaseCommand, getContext } from './BaseCommand'
import { CommandType, type Command, type CommandEnvelope, type StyleChange } from './types'
import { register } from './registry'
import type { ComponentStyle } from '@/types'
import { nanoid } from 'nanoid'

/**
 * 样式变更命令
 *
 * 将属性面板等对组件单个样式字段的修改纳入命令系统，
 * 使撤销/重做能够覆盖样式编辑，而不再绕过 CommandManager。
 */
export class StyleChangeCommand extends BaseCommand {
    type = CommandType.STYLE_CHANGE
    description = '修改样式'
    mergeable = true

    private styleChange: StyleChange

    constructor(componentId: string, key: string, oldValue: unknown, newValue: unknown) {
        super()
        this.id = nanoid()
        this.styleChange = { componentId, key, oldValue, newValue }
        this.data = { ...this.styleChange } as unknown as Record<string, unknown>
    }

    execute(): void {
        getContext().setStyle(this.styleChange.componentId, {
            [this.styleChange.key]: this.styleChange.newValue,
        } as Partial<ComponentStyle>)
    }

    undo(): void {
        getContext().setStyle(this.styleChange.componentId, {
            [this.styleChange.key]: this.styleChange.oldValue,
        } as Partial<ComponentStyle>)
    }

    canMergeWith(other: Command, _mergeTimeWindow: number): boolean {
        return other.type === CommandType.STYLE_CHANGE
            && other instanceof StyleChangeCommand
            && other.styleChange.componentId === this.styleChange.componentId
            && other.styleChange.key === this.styleChange.key
    }

    merge(other: Command): Command {
        if (!(other instanceof StyleChangeCommand)) return this
        return new StyleChangeCommand(
            this.styleChange.componentId,
            this.styleChange.key,
            this.styleChange.oldValue,
            other.styleChange.newValue,
        )
    }
}

// 反序列化工厂:从信封重建 StyleChangeCommand
register(CommandType.STYLE_CHANGE, (env: CommandEnvelope) => {
    const d = env.data as unknown as StyleChange
    const cmd = new StyleChangeCommand(d.componentId, d.key, d.oldValue, d.newValue)
    cmd.id = env.id
    return cmd
})
