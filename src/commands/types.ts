import type { ComponentStyle, ComponentData, CanvasStyleData, CopyData } from '@/types'

/**
 * 命令接口 - 所有命令必须实现
 */
export interface Command {
  /** 执行命令 */
  execute(): void
  /** 撤销命令 */
  undo(): void
  /** 重做命令（默认调用 execute） */
  redo(): void
  /** 命令描述，用于调试和显示 */
  description: string
  /** 命令类型，用于合并判断 */
  type: CommandType
  /** 命令唯一 id(序列化信封用) */
  id: string
  /** 时间戳，用于操作合并的时间窗口判断 */
  timestamp: number
  /** 是否可合并 */
  mergeable: boolean
  /** 命令执行数据（仅保存增量变更） */
  data: Record<string, unknown>
  /** 是否可在给定时间窗口内与另一个命令合并 */
  canMergeWith(other: Command, mergeTimeWindow: number): boolean
  /** 与另一个命令合并 */
  merge(other: Command): Command
  /**
   * 序列化为可持久化/传输的信封。
   * data 必须在 execute 后包含完整撤销所需快照（见各命令实现）。
   */
  serialize(): CommandEnvelope
}

/**
 * 命令信封 - 序列化后的命令载体（纯 JSON，可入 IndexedDB / 跨会话恢复）
 */
export interface CommandEnvelope {
  /** 信封自身的唯一 id（用于时间线 UI 定位） */
  id: string
  /** 命令类型，反序列化时按此查注册表 */
  type: CommandType
  /** 描述（时间线 UI 显示，可选） */
  description?: string
  /** 时间戳 */
  timestamp: number
  /** 命令数据（含撤销所需完整快照） */
  data: Record<string, unknown>
}

/**
 * 命令应用上下文 - 解耦命令与 Pinia store
 *
 * 命令不再直接 useStore()，而是通过 ctx 操作组件数据。
 * ctx 的实现是直接操作 store.componentData 数组。
 * 所有原语都会触发 markDataDirty()（由实现负责），用于自动保存脏标记。
 */
export interface CommandContext {
  /** 按 id 查找组件 */
  get(id: string): ComponentData | undefined
  /** 全部组件（只读视图） */
  getAll(): ComponentData[]
  /** 按 id 查找索引 */
  indexOf(id: string): number
  /** 修改组件样式（增量 patch，仅写提供的字段，保留他人并发修改） */
  setStyle(id: string, patch: Partial<ComponentStyle>): void
  /** 修改组件属性（Object.assign 语义） */
  setProp(id: string, patch: Partial<ComponentData>): void
  /** 插入组件到指定位置（默认末尾） */
  insert(item: ComponentData, index?: number): void
  /** 按 id 移除并返回被移除的组件 */
  remove(id: string): ComponentData | null
  /** 按 id 从数组移除（不级联子组件） */
  removeAt(index: number): ComponentData | null
  /** 移动数组元素位置（图层操作） */
  moveIndex(from: number, to: number): void
  /** 整体替换组件列表（清空/导入/恢复版本） */
  replaceAll(list: ComponentData[]): ComponentData[]
  /** 当前选中组件 */
  readonly curComponent: ComponentData | null
  /** 设置当前选中组件 */
  setCurComponent(id: string | null): void
  /** 画布配置 */
  getCanvas(): CanvasStyleData
  /** 设置画布配置（增量 patch） */
  setCanvas(patch: Partial<CanvasStyleData>): void
  /** 编辑器 DOM（DecomposeCommand 等需要测量画布尺寸） */
  editorEl: HTMLElement | null
  /** 剪贴板(纯本地状态) */
  clipboard: CopyData | null
  /** 设置剪贴板 */
  setClipboard(data: CopyData | null): void
}

/** 命令反序列化工厂类型 */
export type CommandFactory = (env: CommandEnvelope) => Command

/**
 * 命令类型枚举
 */
export enum CommandType {
  // 组件操作
  ADD_COMPONENT = 'ADD_COMPONENT',
  DELETE_COMPONENT = 'DELETE_COMPONENT',
  MOVE_COMPONENT = 'MOVE_COMPONENT',
  RESIZE_COMPONENT = 'RESIZE_COMPONENT',
  ROTATE_COMPONENT = 'ROTATE_COMPONENT',

  // 图层操作
  LAYER_UP = 'LAYER_UP',
  LAYER_DOWN = 'LAYER_DOWN',
  LAYER_TOP = 'LAYER_TOP',
  LAYER_BOTTOM = 'LAYER_BOTTOM',

  // 组合操作
  COMPOSE = 'COMPOSE',
  DECOMPOSE = 'DECOMPOSE',

  // 样式操作
  STYLE_CHANGE = 'STYLE_CHANGE',

  // 批量操作
  BATCH = 'BATCH',
  CLEAR_CANVAS = 'CLEAR_CANVAS',
  IMPORT_DATA = 'IMPORT_DATA',
  RESTORE_VERSION = 'RESTORE_VERSION',

  // 粘贴操作
  PASTE = 'PASTE',

  // 剪切操作
  CUT_COMPONENT = 'CUT_COMPONENT',
}

/**
 * 样式变更数据
 */
export interface StyleChange {
  componentId: string
  key: string
  oldValue: unknown
  newValue: unknown
}

/**
 * 组件位置数据
 */
export interface PositionData {
  componentId: string
  oldStyle: Partial<ComponentStyle>
  newStyle: Partial<ComponentStyle>
}

/**
 * 命令管理器配置
 */
export interface CommandManagerConfig {
  maxStackSize: number
  mergeTimeWindow: number
}
