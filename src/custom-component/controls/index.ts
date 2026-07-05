/**
 * 基础控件组件注册表
 *
 * propConfigs 中的 type 字段映射到这里的控件组件。
 * 新增控件类型只需在此添加一行。
 */

import type { Component } from 'vue'
import InputControl from './InputControl.vue'
import TextareaControl from './TextareaControl.vue'
import NumberControl from './NumberControl.vue'
import ColorControl from './ColorControl.vue'
import SelectControl from './SelectControl.vue'
import SwitchControl from './SwitchControl.vue'

/**
 * 控件映射表：type 字符串 → Vue 组件
 * 属性面板根据 propConfigs[i].type 在这里查找对应控件
 */
export const controlMap: Record<string, Component> = {
    input: InputControl,
    textarea: TextareaControl,
    number: NumberControl,
    color: ColorControl,
    select: SelectControl,
    switch: SwitchControl,
}

/**
 * 根据 type 获取控件组件
 */
export function getControl(type: string): Component {
    return controlMap[type] || InputControl
}
