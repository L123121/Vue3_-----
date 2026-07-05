/**
 * 命令反序列化注册表
 *
 * 序列化: command.serialize() → CommandEnvelope (纯 JSON)
 * 反序列化: registry.deserialize(envelope) → Command 实例
 *
 * 每个命令类在模块加载时调用 register() 自注册。
 * BatchCommand 递归调用 deserialize 重建子命令。
 */

import type { Command, CommandEnvelope, CommandFactory } from './types'
import type { CommandType } from './types'

const registry = new Map<CommandType, CommandFactory>()

export function register(type: CommandType, factory: CommandFactory): void {
    registry.set(type, factory)
}

/** 按信封重建命令实例;未知类型返回 null(跨版本兼容) */
export function deserialize(envelope: CommandEnvelope): Command | null {
    const factory = registry.get(envelope.type)
    if (!factory) {
        console.warn(`[commands] 未知命令类型,跳过: ${envelope.type}`)
        return null
    }
    const cmd = factory(envelope)
    // 恢复元信息(工厂可能只从 data 重建了逻辑字段)
    if (!cmd.id) cmd.id = envelope.id
    cmd.timestamp = envelope.timestamp
    if (envelope.description) cmd.description = envelope.description
    return cmd
}

/** 反序列化整栈(undo 栈) */
export function deserializeStack(envelopes: CommandEnvelope[]): Command[] {
    return envelopes
        .map(env => deserialize(env))
        .filter((c): c is Command => c !== null)
}

/**
 * 命令模块的自注册由各模块在被 import 时完成。
 * `commands/index.ts` import 所有命令模块(副作用),确保 register 调用执行。
 * registry 本身不 import 命令模块,避免循环依赖。
 */
