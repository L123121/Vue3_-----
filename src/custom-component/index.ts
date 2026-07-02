/**
 * 自定义组件注册入口
 *
 * 基于组件注册表动态注册所有组件。
 * 每个组件注册时附带 propConfigs（属性面板元数据），
 * PropPanelRenderer 按此元数据自动渲染编辑控件。
 */

import { defineAsyncComponent, type App } from 'vue'
import { registerComponent, getRegisteredTypes, getComponent, getAttrComponent } from './registry'
import type { PropConfig } from './registry'
import componentList from './component-list'

// ==================== 各组件属性面板配置（元数据驱动） ====================

const componentPropConfigs: Record<string, PropConfig[]> = {
    VText: [
        { key: 'propValue', label: '文字内容', type: 'textarea', rows: 3 },
        { key: 'style.color', label: '文字颜色', type: 'color' },
        { key: 'style.fontSize', label: '字号', type: 'number', min: 12, max: 72 },
        { key: 'style.fontWeight', label: '字重', type: 'number', min: 100, max: 900, step: 100 },
        { key: 'style.textAlign', label: '对齐方式', type: 'select', options: [
            { label: '左对齐', value: 'left' },
            { label: '居中', value: 'center' },
            { label: '右对齐', value: 'right' },
        ] },
        { key: 'style.lineHeight', label: '行高', type: 'number', min: 0.5, max: 3, step: 0.1 },
        { key: 'style.letterSpacing', label: '字间距', type: 'number', min: 0, max: 20 },
    ],
    VButton: [
        { key: 'propValue', label: '按钮文字', type: 'input' },
        { key: 'style.color', label: '文字颜色', type: 'color' },
        { key: 'style.backgroundColor', label: '背景颜色', type: 'color' },
        { key: 'style.fontSize', label: '字号', type: 'number', min: 12, max: 48 },
        { key: 'style.borderRadius', label: '圆角', type: 'number', min: 0, max: 50 },
        { key: 'style.borderWidth', label: '边框宽度', type: 'number', min: 0, max: 10 },
    ],
    Picture: [
        { key: 'propValue.url', label: '图片 URL', type: 'input' },
        { key: 'propValue.flip.horizontal', label: '水平翻转', type: 'switch' },
        { key: 'propValue.flip.vertical', label: '垂直翻转', type: 'switch' },
    ],
    RectShape: [
        { key: 'propValue', label: '显示文字', type: 'textarea', rows: 2 },
        { key: 'style.backgroundColor', label: '填充颜色', type: 'color' },
        { key: 'style.borderColor', label: '边框颜色', type: 'color' },
        { key: 'style.borderWidth', label: '边框宽度', type: 'number', min: 0, max: 20 },
        { key: 'style.borderRadius', label: '圆角', type: 'number', min: 0, max: 100 },
        { key: 'style.borderStyle', label: '边框样式', type: 'select', options: [
            { label: '实线', value: 'solid' },
            { label: '虚线', value: 'dashed' },
            { label: '点线', value: 'dotted' },
        ] },
    ],
    CircleShape: [
        { key: 'propValue', label: '显示文字', type: 'textarea', rows: 2 },
        { key: 'style.backgroundColor', label: '填充颜色', type: 'color' },
        { key: 'style.borderColor', label: '边框颜色', type: 'color' },
        { key: 'style.borderWidth', label: '边框宽度', type: 'number', min: 0, max: 20 },
    ],
    LineShape: [
        { key: 'style.backgroundColor', label: '线条颜色', type: 'color' },
        { key: 'style.width', label: '长度', type: 'number', min: 10, max: 2000 },
        { key: 'style.height', label: '粗细', type: 'number', min: 1, max: 20 },
    ],
    SVGStar: [
        { key: 'style.color', label: '填充颜色', type: 'color' },
        { key: 'style.backgroundColor', label: '背景颜色', type: 'color' },
    ],
    SVGTriangle: [
        { key: 'style.color', label: '填充颜色', type: 'color' },
        { key: 'style.backgroundColor', label: '背景颜色', type: 'color' },
    ],
    // VTable / VChart：使用自定义 Attr.vue（复杂数据编辑），不提供 propConfigs
}

/**
 * 安装自定义组件到 Vue 应用
 */
export default function install(app: App): void {
    // ==================== 注册常规组件（含 SVG） ====================
    componentList.forEach(item => {
        const type = item.component
        const propConfigs = componentPropConfigs[type]
        const isSvg = type.startsWith('SVG')
        const componentPath = isSvg ? `svgs/${type}` : type

        registerComponent(
            type,
            defineAsyncComponent(() => import(`@/custom-component/${componentPath}/Component.vue`)),
            {
                type,
                label: item.label,
                icon: item.icon,
                acceptChildren: type === 'RectShape',
                defaultStyle: item.style,
                defaultPropValue: item.propValue,
                // 传递属性面板元数据。不传则回退到 Attr.vue
                ...(propConfigs ? { propConfigs } : {}),
            },
            // 仍注册 Attr.vue 作为回退（PropPanelRenderer 判断是否需要）
            defineAsyncComponent(() => import(`@/custom-component/${componentPath}/Attr.vue`)),
        )
    })

    // ==================== 注册内部组件 ====================
    registerComponent(
        'Group',
        defineAsyncComponent(() => import('@/custom-component/Group/Component.vue')),
        {
            type: 'Group',
            label: '组合',
            icon: 'qunzu',
            internal: true,
            // Group 不提供 propConfigs，使用 Attr.vue
        },
        defineAsyncComponent(() => import('@/custom-component/Group/Attr.vue')),
    )

    // ==================== 注册到 Vue 全局 ====================
    getRegisteredTypes().forEach(type => {
        app.component(type, getComponent(type)!)
        app.component(`${type}Attr`, getAttrComponent(type)!)
    })
}
