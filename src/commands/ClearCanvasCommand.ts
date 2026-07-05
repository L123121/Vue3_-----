import { BaseCommand, getContext } from './BaseCommand'
import { CommandType, type Command, type CommandEnvelope } from './types'
import { register } from './registry'
import type { ComponentData } from '@/types'
import { nanoid } from 'nanoid'

interface ClearData {
    backupData: ComponentData[]
}

/**
 * 清空画布命令
 */
export class ClearCanvasCommand extends BaseCommand {
    type = CommandType.CLEAR_CANVAS
    description = '清空画布'
    mergeable = false

    private clearData: ClearData

    constructor() {
        super()
        this.id = nanoid()
        this.clearData = { backupData: [] }
        this.data = this.clearData as unknown as Record<string, unknown>
    }

    execute(): void {
        const ctx = getContext()
        // 备份当前所有组件(撤销用)
        this.clearData.backupData = ctx.getAll().map(c => structuredClone(c))
        this.data = { backupData: this.clearData.backupData } as unknown as Record<string, unknown>

        ctx.replaceAll([])
        ctx.setCurComponent(null)
    }

    undo(): void {
        const ctx = getContext()
        ctx.replaceAll(this.clearData.backupData.map(c => structuredClone(c)))
    }

    canMergeWith(): boolean {
        return false
    }

    merge(other: Command): Command {
        return other
    }
}

register(CommandType.CLEAR_CANVAS, (env: CommandEnvelope) => {
    const d = env.data as unknown as ClearData
    const cmd = new ClearCanvasCommand()
    cmd.id = env.id
    ;(cmd as unknown as { clearData: ClearData }).clearData = {
        backupData: (d.backupData ?? []).map(c => structuredClone(c)),
    }
    cmd.data = (cmd as unknown as { clearData: ClearData }).clearData as unknown as Record<string, unknown>
    return cmd
})
