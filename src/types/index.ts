/**
 * 低代码平台核心类型定义
 */

// ==================== 基础样式 ====================
export interface ComponentStyle {
  width: number
  height: number
  top?: number
  left?: number
  rotate?: number
  opacity?: number
  fontSize?: number
  fontWeight?: number
  lineHeight?: string
  letterSpacing?: number
  textAlign?: 'left' | 'center' | 'right'
  color?: string
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  borderStyle?: 'solid' | 'dashed' | 'dotted'
  borderRadius?: string
  padding?: number
  verticalAlign?: 'top' | 'middle' | 'bottom'
}

// ==================== 请求配置 ====================
export interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data: Record<string, unknown>[]
  url: string
  series: boolean // 是否定时发送请求
  time: number // 定时更新时间(ms)
  paramType: '' | 'string' | 'object' | 'array'
  requestCount: number // 请求次数限制，0 为无限
}

// ==================== 动画配置 ====================
export interface Animation {
  type: string
  label?: string
  duration: number
  delay: number
  iterationNum: number
  infinite: boolean
  applyTo: 'enter' | 'leave'
}

// ==================== 组件联动 ====================
export interface LinkageItem {
  id: string
  label: string
  event: string
  style: Array<{ key: string; value: string }>
}

export interface LinkageConfig {
  duration: number
  data: LinkageItem[]
}

// ==================== 图片属性 ====================
export interface PicturePropValue {
  url: string
  flip: {
    horizontal: boolean
    vertical: boolean
  }
}

// ==================== 表格属性 ====================
export interface TablePropValue {
  data: string[][]
  stripe: boolean
  thBold: boolean
}

// ==================== 图表属性 ====================
export interface ChartPropValue {
  chart: string
  option: Record<string, unknown>
}

// ==================== 组件数据 ====================
export type PropValue = string | PicturePropValue | TablePropValue | ChartPropValue | ComponentData[]

export interface ComponentData {
  id: string
  component: string
  label: string
  icon: string
  propValue: PropValue
  style: ComponentStyle
  /** 父组件 ID，null 或 undefined 表示根级组件 */
  parentId: string | null
  /** 插入的插槽名称（用于多插槽容器） */
  slot: string
  /** 视觉层级，值越大越靠上。由 store 的图层操作自动管理，非手动编辑 */
  zIndex: number
  request?: RequestConfig
  animations: Animation[]
  events: Record<string, string>
  groupStyle: Record<string, unknown>
  isLock: boolean
  collapseName: string
  linkage: LinkageConfig
}

// ==================== 画布配置 ====================
export interface CanvasStyleData {
  width: number
  height: number
  scale: number
  color: string
  opacity: number
  backgroundColor: string
  fontSize: number
}

// ==================== 框选区域 ====================
export interface AreaData {
  style: {
    top: number
    left: number
    width: number
    height: number
  }
  components: ComponentData[]
}

// ==================== 复制数据 ====================
export interface CopyData {
  data: ComponentData
  index: number
  isCut?: boolean
}

// ==================== Store 状态 ====================
export interface StoreState {
  editMode: 'edit' | 'preview'
  canvasStyleData: CanvasStyleData
  componentData: ComponentData[]
  curComponent: ComponentData | null
  curComponentIndex: number | null
  isClickComponent: boolean
  editor: HTMLElement | null
  menuTop: number
  menuLeft: number
  menuShow: boolean
  copyData: CopyData | null
  isDarkMode: boolean
  rightList: boolean
  isInEditor: boolean
  areaData: AreaData
  versions: PageVersion[]
  /** 数据版本号，每次 componentData 变更时递增，用于自动保存的脏标记 */
  dataVersion: number
}

// ==================== Store Actions Payloads ====================
export interface SetCurComponentPayload {
  component: ComponentData | null
  index: number | null
}

export interface SetShapeStylePayload {
  top?: number
  left?: number
  width?: number
  height?: number
  rotate?: number
}

export interface AddComponentPayload {
  component: ComponentData
  index?: number
}

export interface AddEventPayload {
  event: string
  param: string
}

export interface AlterAnimationPayload {
  index: number
  data: Partial<Animation>
}

export interface ShowContextMenuPayload {
  top: number
  left: number
}

// ==================== 组件模板定义 ====================
export interface ComponentTemplate {
  component: string
  label: string
  propValue: PropValue
  icon: string
  request?: RequestConfig
  style: Partial<ComponentStyle>
}

// ==================== 公共样式 ====================
export const commonStyle: Pick<ComponentStyle, 'rotate' | 'opacity'> = {
    rotate: 0,
    opacity: 1,
}

type CommonAttr = Pick<
    ComponentData,
    | 'animations'
    | 'events'
    | 'groupStyle'
    | 'isLock'
    | 'collapseName'
    | 'linkage'
    | 'parentId'
    | 'slot'
    | 'zIndex'
>

export const commonAttr: CommonAttr = {
    animations: [],
    events: {},
    groupStyle: {},
    isLock: false,
    collapseName: 'style',
    parentId: null,
    slot: 'default',
    zIndex: 0,
    linkage: {
        duration: 0,
        data: [
            {
                id: '',
                label: '',
                event: '',
                style: [{ key: '', value: '' }],
            },
        ],
    },
}

// ==================== 版本管理 ====================
export interface PageVersion {
  id: string
  name: string              // 版本名称
  description: string       // 版本描述
  snapshot: ComponentData[] // 页面快照
  createdAt: string         // 创建时间
  thumbnail?: string        // 缩略图（base64）
}
