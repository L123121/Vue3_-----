import { BaseCommand } from './BaseCommand'
import { CommandType, type Command, type CommandEnvelope } from './types'
import { register, deserialize } from './registry'
import { nanoid } from 'nanoid'

interface BatchData {
    description: string
    /** 子命令信封数组(递归序列化) */
    subCommands: CommandEnvelope[]
}

/**
 * 批量命令 - 用于将多个命令组合成一个原子操作
 *
 * 序列化时递归 serialize 子命令;反序列化时递归 deserialize 重建。
 */
export class BatchCommand extends BaseCommand {
    type = CommandType.BATCH
    mergeable = false

    private commands: Command[] = []
    private readonly batchDescription: string

    constructor(description: string = '批量操作') {
        super()
        this.id = nanoid()
        this.batchDescription = description
        this.description = description
    }

    addCommand(command: Command): void {
        this.commands.push(command)
    }

    execute(): void {
        this.commands.forEach(cmd => cmd.execute())
    }

    undo(): void {
        // 反向撤销
        for (let i = this.commands.length - 1; i >= 0; i--) {
            this.commands[i].undo()
        }
    }

    serialize(): CommandEnvelope {
        return {
            id: this.id,
            type: this.type,
            description: this.batchDescription,
            timestamp: this.timestamp,
            data: {
                description: this.batchDescription,
                subCommands: this.commands.map(cmd => cmd.serialize()),
            } as Record<string, unknown>,
        }
    }

    canMergeWith(): boolean {
        return false
    }

    merge(other: Command): Command {
        return other
    }
}

register(CommandType.BATCH, (env: CommandEnvelope) => {
    const d = env.data as unknown as BatchData
    const cmd = new BatchCommand(d.description ?? '批量操作')
    cmd.id = env.id
    // 递归反序列化子命令
    const subEnvelopes = d.subCommands ?? []
    for (const subEnv of subEnvelopes) {
        const sub = deserialize(subEnv)
        if (sub) cmd.addCommand(sub)
    }
    return cmd
})
