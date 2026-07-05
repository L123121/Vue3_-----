/**
 * 命令注册初始化
 *
 * 显式触发所有命令模块的注册逻辑。
 * 每个命令文件在模块加载时调用 register() 自注册。
 * 此函数确保所有命令模块被显式加载。
 *
 * 在 main.ts 中调用: registerAllCommands()
 */

// 所有命令模块的 import 会触发其模块级的 register() 调用
import './MoveCommand'
import './ResizeCommand'
import './RotateCommand'
import './AddComponentCommand'
import './DeleteComponentCommand'
import './LayerCommand'
import './ComposeCommand'
import './DecomposeCommand'
import './ClearCanvasCommand'
import './ImportDataCommand'
import './PasteCommand'
import './CutCommand'
import './BatchCommand'

export function registerAllCommands(): void {
    // 所有注册已在 import 时完成。此函数作为显式初始化的入口点。
}