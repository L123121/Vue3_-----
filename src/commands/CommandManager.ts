import type { Command, CommandManagerConfig, CommandEnvelope } from './types'
import { BatchCommand } from './BatchCommand'
import { deserializeStack } from './registry'

/**
 * 批量操作助手
 */
export class BatchOperation {
    private readonly batchCommand: BatchCommand
    private readonly manager: CommandManager

    constructor(manager: CommandManager, description: string) {
        this.manager = manager
        this.batchCommand = new BatchCommand(description)
    }

    add(command: Command): this {
        this.batchCommand.addCommand(command)
        return this
    }

    commit(): void {
        this.manager.execute(this.batchCommand)
    }
}

/**
 * 命令管理器 - 双栈撤销重做
 */
export class CommandManager {
    private undoStack: Command[] = []
    private redoStack: Command[] = []
    private readonly config: CommandManagerConfig

    constructor(config: Partial<CommandManagerConfig> = {}) {
        this.config = {
            maxStackSize: config.maxStackSize ?? 50,
            mergeTimeWindow: config.mergeTimeWindow ?? 300,
        }
    }

    /**
   * 执行命令并压入撤销栈
   */
    execute(command: Command): void {
        const lastCommand = this.undoStack[this.undoStack.length - 1]

        if (this.shouldMerge(lastCommand, command)) {
            const mergedCommand = lastCommand!.merge(command)
            this.undoStack[this.undoStack.length - 1] = mergedCommand
            mergedCommand.execute()
            this.redoStack = []
            return
        }

        command.execute()
        this.undoStack.push(command)
        this.redoStack = []

        if (this.undoStack.length > this.config.maxStackSize) {
            this.undoStack.shift()
        }
    }

    private shouldMerge(lastCommand: Command | undefined, command: Command): boolean {
        if (!lastCommand || !lastCommand.mergeable || !command.mergeable) {
            return false
        }

        const timeDiff = Math.abs(command.timestamp - lastCommand.timestamp)
        if (timeDiff > this.config.mergeTimeWindow) {
            return false
        }

        return lastCommand.canMergeWith(command, this.config.mergeTimeWindow)
    }

    undo(): boolean {
        const command = this.undoStack.pop()
        if (!command) return false

        command.undo()
        this.redoStack.push(command)
        return true
    }

    redo(): boolean {
        const command = this.redoStack.pop()
        if (!command) return false

        command.redo()
        this.undoStack.push(command)
        return true
    }

    canUndo(): boolean {
        return this.undoStack.length > 0
    }

    canRedo(): boolean {
        return this.redoStack.length > 0
    }

    getUndoStackSize(): number {
        return this.undoStack.length
    }

    getRedoStackSize(): number {
        return this.redoStack.length
    }

    clear(): void {
        this.undoStack = []
        this.redoStack = []
    }

    beginBatch(description: string = '批量操作'): BatchOperation {
        return new BatchOperation(this, description)
    }

    // ==================== 跨会话序列化 ====================

    /**
     * 导出撤销栈为信封数组(可入 IndexedDB / localStorage)。
     * 仅导出 undoStack;redoStack 在跨会话后通常无意义(用户已离开)。
     */
    exportStack(): CommandEnvelope[] {
        return this.undoStack.map(cmd => cmd.serialize())
    }

    /**
     * 从信封数组恢复撤销栈(刷新后调用)。
     * 反序列化失败的命令跳过,保证向前兼容。
     */
    importStack(envelopes: CommandEnvelope[]): void {
        this.undoStack = deserializeStack(envelopes)
        this.redoStack = []
    }

    /**
     * 导出当前可撤销的命令描述列表(时间线 UI 用,不含敏感数据)。
     */
    getUndoDescriptions(): Array<{ id: string; description: string; timestamp: number }> {
        return this.undoStack.map(cmd => ({
            id: cmd.id,
            description: cmd.description,
            timestamp: cmd.timestamp,
        }))
    }
}
