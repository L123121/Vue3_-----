/**
 * Agent 工具定义注册表
 * 统一管理所有工具的 JSON Schema 定义和元信息
 */

import { nanoid } from '../utils/nanoid.js'

/** 支持的组件类型 */
export const SUPPORTED_COMPONENTS = new Set([
    'VText',
    'VButton',
    'Picture',
    'RectShape',
    'CircleShape',
    'LineShape',
    'VTable',
])

/**
 * 工具定义（OpenAI function-calling 格式）
 * 供 LLM 函数调用和 JSON 模式场景共用
 */
export const TOOLS = [
    {
        type: 'function',
        function: {
            name: 'apply_layout',
            description: '应用页面布局方式（居中聚焦/上下分层/左右分割/网格式/环绕式）',
            parameters: {
                type: 'object',
                properties: {
                    layout: {
                        type: 'string',
                        enum: ['居中聚焦', '上下分层', '左右分割', '网格式', '环绕式'],
                        description: '布局方式',
                    },
                    reason: { type: 'string', description: '选择该布局的原因' },
                },
                required: ['layout'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'apply_style',
            description: '应用视觉风格（酷炫潮流/简约商务/文艺清新/复古怀旧/科技未来）',
            parameters: {
                type: 'object',
                properties: {
                    style: {
                        type: 'string',
                        enum: ['酷炫潮流', '简约商务', '文艺清新', '复古怀旧', '科技未来'],
                        description: '视觉风格',
                    },
                },
                required: ['style'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'apply_color_scheme',
            description: '应用配色方案',
            parameters: {
                type: 'object',
                properties: {
                    scheme: { type: 'string', description: '配色方案名（如"莫兰迪色系"、"蓝白冷色"）' },
                    primary: { type: 'string', description: '主色（十六进制）' },
                    secondary: { type: 'string', description: '辅色' },
                    background: { type: 'string', description: '背景色' },
                },
                required: ['scheme'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'add_component',
            description: '添加组件到画布',
            parameters: {
                type: 'object',
                properties: {
                    component: {
                        type: 'string',
                        enum: [...SUPPORTED_COMPONENTS],
                        description: '组件类型',
                    },
                    label: { type: 'string', description: '组件标签名' },
                    propValue: { type: 'string', description: '组件属性值' },
                    style: { type: 'object', description: '组件样式（width/height/top/left/color 等）' },
                },
                required: ['component', 'label'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'modify_component',
            description: '修改已有组件的属性或样式',
            parameters: {
                type: 'object',
                properties: {
                    id: { type: 'string', description: '组件 ID' },
                    style: { type: 'object', description: '要修改的样式字段' },
                    propValue: { description: '要修改的属性值' },
                },
                required: ['id'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'set_canvas_style',
            description: '设置画布配置（背景色、尺寸等）',
            parameters: {
                type: 'object',
                properties: {
                    backgroundColor: { type: 'string', description: '背景色' },
                    width: { type: 'number', description: '宽度' },
                    height: { type: 'number', description: '高度' },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'observe_canvas',
            description: '读取当前画布、选中组件和所有组件的真实 ID、内容及样式',
            parameters: { type: 'object', properties: {} },
        },
    },
    {
        type: 'function',
        function: {
            name: 'inspect_component',
            description: '按 ID 读取单个组件的完整可编辑信息',
            parameters: {
                type: 'object',
                properties: { id: { type: 'string', description: '组件 ID' } },
                required: ['id'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'move_component',
            description: '移动已有组件到新的 top/left 坐标',
            parameters: {
                type: 'object',
                properties: {
                    id: { type: 'string', description: '组件 ID' },
                    top: { type: 'number', description: '新的顶部坐标' },
                    left: { type: 'number', description: '新的左侧坐标' },
                },
                required: ['id'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'resize_component',
            description: '调整已有组件宽高',
            parameters: {
                type: 'object',
                properties: {
                    id: { type: 'string', description: '组件 ID' },
                    width: { type: 'number', description: '新的宽度' },
                    height: { type: 'number', description: '新的高度' },
                },
                required: ['id'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'delete_component',
            description: '删除已有组件及其子组件',
            parameters: {
                type: 'object',
                properties: { id: { type: 'string', description: '组件 ID' } },
                required: ['id'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'reorder_layer',
            description: '调整组件图层顺序',
            parameters: {
                type: 'object',
                properties: {
                    id: { type: 'string', description: '组件 ID' },
                    action: {
                        type: 'string',
                        enum: ['up', 'down', 'top', 'bottom'],
                        description: '上移一层、下移一层、置顶或置底',
                    },
                },
                required: ['id', 'action'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'ask_user',
            description: '在关键决策点暂停，让用户选择方案',
            parameters: {
                type: 'object',
                properties: {
                    question: { type: 'string', description: '要向用户展示的问题' },
                    options: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                title: { type: 'string' },
                                description: { type: 'string' },
                                tag: { type: 'string' },
                            },
                            required: ['id', 'title', 'description'],
                        },
                        description: '2~4 个选项',
                    },
                },
                required: ['question', 'options'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'finish',
            description: '任务完成，输出最终页面',
            parameters: {
                type: 'object',
                properties: {
                    summary: { type: 'string', description: '完成总结' },
                },
                required: ['summary'],
            },
        },
    },
]

/**
 * 获取指定工具的定义
 * @param {string} name
 * @returns {object|undefined}
 */
export function getTool(name) {
    return TOOLS.find(t => t.function.name === name)
}

/**
 * 获取所有工具名
 * @returns {string[]}
 */
export function getToolNames() {
    return TOOLS.map(t => t.function.name)
}

export function validateToolCall(name, args) {
    const tool = getTool(name)
    if (!tool) throw new Error(`模型返回了未知工具: ${name}`)
    const parameters = tool.function.parameters || {}
    const safeArgs = args && typeof args === 'object' && !Array.isArray(args) ? args : {}

    for (const requiredKey of parameters.required || []) {
        if (safeArgs[requiredKey] === undefined || safeArgs[requiredKey] === null || safeArgs[requiredKey] === '') {
            throw new Error(`${name} 缺少必填参数: ${requiredKey}`)
        }
    }

    for (const [key, definition] of Object.entries(parameters.properties || {})) {
        const value = safeArgs[key]
        if (value === undefined) continue
        if (definition.enum && !definition.enum.includes(value)) {
            throw new Error(`${name}.${key} 不在允许范围内`)
        }
        if (definition.type === 'number' && !Number.isFinite(Number(value))) {
            throw new Error(`${name}.${key} 必须是数字`)
        }
        if (definition.type === 'string' && typeof value !== 'string') {
            throw new Error(`${name}.${key} 必须是字符串`)
        }
        if (definition.type === 'array' && !Array.isArray(value)) {
            throw new Error(`${name}.${key} 必须是数组`)
        }
        if (definition.type === 'object' && (!value || typeof value !== 'object' || Array.isArray(value))) {
            throw new Error(`${name}.${key} 必须是对象`)
        }
    }

    return safeArgs
}

/**
 * 检查组件类型是否被支持
 * @param {string} componentType
 * @returns {boolean}
 */
export function isComponentSupported(componentType) {
    return SUPPORTED_COMPONENTS.has(String(componentType))
}
