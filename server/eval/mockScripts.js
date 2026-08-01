/**
 * Mock 模式决策脚本
 *
 * 每个任务一份确定性脚本（LLM 决策序列），用于：
 *   - 无 API 成本的端到端回归：验证工具执行、布局引擎、循环控制、评分器
 *   - 变更 prompt/工具后的基准回归
 *
 * 脚本结构与 runAgentLoop 的决策一致：{ toolName, args } 或 { type: 'ask_user'|'finish', args }
 */

/** 每个任务的最小可满足期望脚本 */
const MOCK_SCRIPTS = {
    // 招新海报：布局 + 标题 + 时间地点 + 报名按钮
    poster_dance_recruit: [
        { toolName: 'apply_layout', args: { layout: '居中聚焦', reason: '招新海报居中排版' } },
        {
            toolName: 'add_component',
            args: {
                component: 'VText',
                label: '主标题',
                propValue: '街舞社招新',
                style: { width: 300, height: 80, fontSize: 32, fontWeight: 700, textAlign: 'center', color: '#333' },
            },
        },
        {
            toolName: 'add_component',
            args: {
                component: 'VText',
                label: '时间地点',
                propValue: '时间：本周六 19:00\n地点：大学生活动中心',
                style: { width: 300, height: 64, fontSize: 16, textAlign: 'center', color: '#555' },
            },
        },
        {
            toolName: 'add_component',
            args: {
                component: 'VButton',
                label: '报名按钮',
                propValue: '立即报名',
                style: { width: 200, height: 48, fontSize: 18, backgroundColor: '#409eff', color: '#fff' },
            },
        },
        { type: 'finish', args: { summary: '招新海报已完成' } },
    ],

    // 活动宣传海报
    poster_activity_promo: [
        { toolName: 'apply_layout', args: { layout: '居中聚焦', reason: '活动海报居中' } },
        {
            toolName: 'add_component',
            args: {
                component: 'VText',
                label: '活动标题',
                propValue: '校园音乐节',
                style: { width: 300, height: 72, fontSize: 34, fontWeight: 700, textAlign: 'center' },
            },
        },
        {
            toolName: 'add_component',
            args: {
                component: 'VText',
                label: '时间',
                propValue: '时间：本周五 19:00',
                style: { width: 280, height: 40, fontSize: 16, textAlign: 'center' },
            },
        },
        {
            toolName: 'add_component',
            args: {
                component: 'VText',
                label: '地点',
                propValue: '地点：大学生活动中心',
                style: { width: 280, height: 40, fontSize: 16, textAlign: 'center' },
            },
        },
        { type: 'finish', args: { summary: '活动海报已完成' } },
    ],

    // 社团报名表
    form_registration: [
        { toolName: 'apply_layout', args: { layout: '上下分层', reason: '报名表上下排布' } },
        {
            toolName: 'add_component',
            args: {
                component: 'VText',
                label: '报名表标题',
                propValue: '社团报名表',
                style: { width: 300, height: 56, fontSize: 28, fontWeight: 700, textAlign: 'center' },
            },
        },
        {
            toolName: 'add_component',
            args: {
                component: 'VText',
                label: '姓名',
                propValue: '姓名：__________',
                style: { width: 300, height: 40, fontSize: 16, textAlign: 'left' },
            },
        },
        {
            toolName: 'add_component',
            args: {
                component: 'VText',
                label: '联系方式',
                propValue: '联系方式：__________',
                style: { width: 300, height: 40, fontSize: 16, textAlign: 'left' },
            },
        },
        {
            toolName: 'add_component',
            args: {
                component: 'VButton',
                label: '提交按钮',
                propValue: '提交报名',
                style: { width: 200, height: 48, fontSize: 18, backgroundColor: '#67c23a', color: '#fff' },
            },
        },
        { type: 'finish', args: { summary: '报名表已完成' } },
    ],

    // 修改标题字号（初始画布含标题与按钮）
    edit_title_font: [
        {
            toolName: 'modify_component',
            args: { id: 'title_1', style: { fontSize: 34, fontWeight: 700 } },
        },
        { type: 'finish', args: { summary: '标题已放大' } },
    ],

    // 删除图片（初始画布含标题与图片）
    delete_component: [
        { toolName: 'delete_component', args: { id: 'pic_1' } },
        { type: 'finish', args: { summary: '图片已删除' } },
    ],

    // 居中聚焦布局（初始画布两个文本组件）
    layout_center_focus: [
        { toolName: 'apply_layout', args: { layout: '居中聚焦', reason: '重新居中排版' } },
        { type: 'finish', args: { summary: '布局已重排' } },
    ],

    // 空画布模糊需求：无脚本（空脚本 → mock 直接返回 finish，应触发方向确认）
    empty_canvas_vague: [],
}

/**
 * 获取某任务的 mock 脚本（无则返回空数组）
 * @param {string} taskId
 * @returns {Array}
 */
export function getMockScript(taskId) {
    return MOCK_SCRIPTS[taskId] || []
}

/**
 * 获取全部 mock 脚本
 * @returns {Record<string,Array>}
 */
export function getAllMockScripts() {
    return MOCK_SCRIPTS
}
