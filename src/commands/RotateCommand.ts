import { BaseCommand, getContext } from './BaseCommand'
import { CommandType, type Command, type CommandEnvelope } from './types'
import { register } from './registry'
import { nanoid } from 'nanoid'

/**
 * 旋转组件命令
 */
export class RotateCommand extends BaseCommand {
    type = CommandType.ROTATE_COMPONENT
    description = '旋转组件'
    mergeable = true

    constructor(
        private componentId: string,
        private oldRotate: number,
        private newRotate: number,
    ) {
        super()
        this.id = nanoid()
        this.data = {
            componentId,
            oldRotate,
            newRotate,
        }
    }

    execute(): void {
        getContext().setStyle(this.componentId, { rotate: this.newRotate })
    }

    undo(): void {
        getContext().setStyle(this.componentId, { rotate: this.oldRotate })
    }

    canMergeWith(other: Command, _mergeTimeWindow: number): boolean {
        if (other.type !== CommandType.ROTATE_COMPONENT) return false
        if (!(other instanceof RotateCommand)) return false

        return this.componentId === other.componentId
    }

    merge(other: Command): RotateCommand {
        if (!(other instanceof RotateCommand)) return this

        return new RotateCommand(this.componentId, this.oldRotate, other.newRotate)
    }
}

register(CommandType.ROTATE_COMPONENT, (env: CommandEnvelope) => {
    const d = env.data as { componentId: string; oldRotate: number; newRotate: number }
    const cmd = new RotateCommand(d.componentId, d.oldRotate, d.newRotate)
    cmd.id = env.id
    return cmd
})
