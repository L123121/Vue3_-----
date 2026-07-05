import { BaseCommand, getContext } from './BaseCommand'
import { CommandType, type Command, type CommandEnvelope } from './types'
import { register } from './registry'
import type { ComponentData, CanvasStyleData } from '@/types'
import { nanoid } from 'nanoid'

interface ImportData {
    newComponentData: ComponentData[]
    newCanvasStyle?: CanvasStyleData
    backupComponentData: ComponentData[]
    backupCanvasStyle: CanvasStyleData | null
}

/**
 * 导入数据命令
 */
export class ImportDataCommand extends BaseCommand {
    type = CommandType.IMPORT_DATA
    description = '导入数据'
    mergeable = false

    private importData: ImportData

    constructor(newComponentData: ComponentData[], newCanvasStyle?: CanvasStyleData) {
        super()
        this.id = nanoid()
        this.importData = {
            newComponentData: newComponentData.map(c => structuredClone(c)),
            newCanvasStyle: newCanvasStyle ? { ...newCanvasStyle } : undefined,
            backupComponentData: [],
            backupCanvasStyle: null,
        }
        this.data = this.importData as unknown as Record<string, unknown>
    }

    execute(): void {
        const ctx = getContext()

        this.importData.backupComponentData = ctx.getAll().map(c => structuredClone(c))
        this.importData.backupCanvasStyle = { ...ctx.getCanvas() }

        ctx.replaceAll(this.importData.newComponentData.map(c => structuredClone(c)))
        if (this.importData.newCanvasStyle) {
            ctx.setCanvas(this.importData.newCanvasStyle)
        }

        ctx.setCurComponent(null)
        this.data = { ...this.importData } as unknown as Record<string, unknown>
    }

    undo(): void {
        const ctx = getContext()
        ctx.replaceAll(this.importData.backupComponentData.map(c => structuredClone(c)))
        if (this.importData.backupCanvasStyle) {
            ctx.setCanvas(this.importData.backupCanvasStyle)
        }
    }

    canMergeWith(): boolean {
        return false
    }

    merge(other: Command): Command {
        return other
    }
}

register(CommandType.IMPORT_DATA, (env: CommandEnvelope) => {
    const d = env.data as unknown as ImportData
    const cmd = new ImportDataCommand(d.newComponentData, d.newCanvasStyle)
    cmd.id = env.id
    ;(cmd as unknown as { importData: ImportData }).importData = {
        newComponentData: (d.newComponentData ?? []).map(c => structuredClone(c)),
        newCanvasStyle: d.newCanvasStyle ? { ...d.newCanvasStyle } : undefined,
        backupComponentData: (d.backupComponentData ?? []).map(c => structuredClone(c)),
        backupCanvasStyle: d.backupCanvasStyle ? { ...d.backupCanvasStyle } : null,
    }
    cmd.data = (cmd as unknown as { importData: ImportData }).importData as unknown as Record<string, unknown>
    return cmd
})
