/**
 * 组件注册表
 *
 * 提供动态注册组件的 API，替代硬编码注册方式。
 * 新增组件只需调用 registerComponent()，无需修改编辑器核心代码。
 */

import type { Component } from 'vue'
import type { ComponentStyle } from '@/types'

/**
 * 组件元数据 - 组件的"说明书"
 */
export interface ComponentMetaData {
  /** 组件类型名（对应 Vue 组件名，如 'VText'） */
  type: string
  /** 组件库中显示的标签 */
  label: string
  /** 图标名 */
  icon: string
  /** 是否可包含子组件（容器组件设为 true） */
  acceptChildren?: boolean
  /** 是否内部组件（设为 true 时不显示在组件面板） */
  internal?: boolean
  /** 默认样式 */
  defaultStyle?: Partial<ComponentStyle>
  /** 默认 propValue */
  defaultPropValue?: unknown
  /** 属性面板配置项（元数据驱动，不填则回退到 Attr.vue） */
  propConfigs?: PropConfig[]
}

// ==================== 属性面板元数据类型 ====================

export interface PropConfig {
  /** 属性路径，如 'propValue' 或 'style.color' 或 'propValue.flip.horizontal' */
  key: string
  /** 表单标签 */
  label: string
  /** 控件类型 */
  type: 'input' | 'textarea' | 'number' | 'color' | 'select' | 'switch'
  /** 选项列表（select 类型使用） */
  options?: { label: string; value: string | number }[]
  /** 最小值（number 类型使用） */
  min?: number
  /** 最大值（number 类型使用） */
  max?: number
  /** 步长（number 类型使用） */
  step?: number
  /** placeholder 提示文字 */
  placeholder?: string
  /** textarea 行数 */
  rows?: number
}

/**
 * 注册表条目
 */
interface RegistryEntry {
  component: Component
  attrComponent: Component | null
  meta: ComponentMetaData
}

// ==================== 内部存储 ====================

const registryMap = new Map<string, RegistryEntry>()

// ==================== 公开 API ====================

/**
 * 注册一个低代码组件
 *
 * @param type        组件类型（如 'VText'），需与 Vue 组件名一致
 * @param component   组件本身
 * @param meta        组件元数据（标签、图标、容器声明等）
 * @param attrComponent  属性面板配置组件（可选）
 *
 * @example
 * registerComponent('VText', VTextComponent, {
 *   type: 'VText',
 *   label: '文字',
 *   icon: 'wenben',
 * }, VTextAttr)
 */
export function registerComponent(
    type: string,
    component: Component,
    meta: ComponentMetaData,
    attrComponent?: Component,
): void {
    registryMap.set(type, {
        component,
        attrComponent: attrComponent ?? null,
        meta: {
            ...meta,
            acceptChildren: meta.acceptChildren ?? false,
        },
    })
}

/**
 * 根据组件类型获取组件
 */
export function getComponent(type: string): Component | undefined {
    return registryMap.get(type)?.component
}

/**
 * 根据组件类型获取属性面板组件
 */
export function getAttrComponent(type: string): Component | null | undefined {
    return registryMap.get(type)?.attrComponent
}

/**
 * 根据组件类型获取元数据
 */
export function getComponentMeta(type: string): ComponentMetaData | undefined {
    return registryMap.get(type)?.meta
}

/**
 * 获取所有已注册组件的类型名列表
 */
export function getRegisteredTypes(): string[] {
    return Array.from(registryMap.keys())
}

/**
 * 获取所有公开组件（非 internal）的元数据列表
 * 用于左侧组件面板渲染
 */
export function getPublicComponents(): ComponentMetaData[] {
    return Array.from(registryMap.values())
        .filter(entry => !entry.meta.internal)
        .map(entry => entry.meta)
}

/**
 * 获取所有内部组件（仅用于渲染，不显示在面板）
 */
export function getInternalComponents(): ComponentMetaData[] {
    return Array.from(registryMap.values())
        .filter(entry => entry.meta.internal)
        .map(entry => entry.meta)
}

/**
 * 判断组件是否为容器（可包含子组件）
 */
export function isContainer(type: string): boolean {
    return registryMap.get(type)?.meta.acceptChildren ?? false
}

/**
 * 获取所有容器的类型名列表
 */
export function getContainerTypes(): string[] {
    return Array.from(registryMap.entries())
        .filter(([_, entry]) => entry.meta.acceptChildren)
        .map(([type]) => type)
}
