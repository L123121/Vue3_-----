import { CommandType, type Command, type CommandEnvelope, type CommandContext } from './types'

/**
 * 命令基类 - 提供默认实现
 */
export abstract class BaseCommand implements Command {
    description = ''
    type: CommandType = CommandType.BATCH
    /** 命令唯一 id(序列化信封用) */
    id: string = ''

    timestamp: number = Date.now()
    mergeable: boolean = false
    data: Record<string, unknown> = {}

    abstract execute(): void
    abstract undo(): void

    redo(): void {
        this.execute()
    }

    /**
     * 检查是否可以与另一个命令合并
     */
    canMergeWith(_other: Command, _mergeTimeWindow: number): boolean {
        return false
    }

    /**
     * 与另一个命令合并
     */
    merge(_other: Command): Command {
        return this
    }

    serialize(): CommandEnvelope {
        return {
            id: this.id,
            type: this.type,
            description: this.description,
            timestamp: this.timestamp,
            data: this.data,
        }
    }
}

// ==================== 命令上下文注入 ====================

let _ctx: CommandContext | null = null

/**
 * 注入命令上下文(由 store 在初始化时调用一次)。
 * 命令通过 getContext() 取用,而非直接 useStore(),以解耦协同实现。
 */
export function setCommandContext(ctx: CommandContext): void {
    _ctx = ctx
}

/** 命令内部获取上下文;未注入时抛错(防止误用) */
export function getContext(): CommandContext {
    if (!_ctx) {
        throw new Error('CommandContext 未注入:请在 store 初始化时调用 setCommandContext()')
    }
    return _ctx
}
