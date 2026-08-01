/**
 * Agent Eval 任务集
 *
 * 每条任务包含：用户输入、画布初始状态、期望结果标准。
 * 用于：
 *   - mock 模式：脚本化 LLM 决策，确定性回归工具/循环逻辑
 *   - live 模式：真实 LLM 生成，量化质量（组件覆盖、验证器通过率）
 *
 * 期望标准字段说明：
 *   - minComponents: 画布组件数下限
 *   - requireComponents: 必须出现的组件类型集合
 *   - requireText: 必须出现在某个文本组件 propValue 中的关键字（任一命中即满足）
 *   - validatorPass: 完成时画布必须通过 validateCanvas（无 error）
 *   - maxSteps: 允许的最大工具步数（防失控）
 */

/**
 * 默认画布（与 sessionStore.create 一致）
 */
const DEFAULT_CANVAS = {
    width: 375,
    height: 667,
    scale: 100,
    color: '#000',
    opacity: 1,
    backgroundColor: '#ffffff',
    fontSize: 14,
}

/**
 * @type {import('./eval.types.js').EvalTask[]}
 */
export const EVAL_TASKS = [
    {
        id: 'poster_dance_recruit',
        name: '街舞社招新海报',
        prompt: '做一个街舞社招新海报，标题突出，包含时间地点和报名按钮',
        canvasStyle: { ...DEFAULT_CANVAS },
        initialCanvas: [],
        expected: {
            minComponents: 3,
            requireComponents: ['VText', 'VButton'],
            requireText: ['街舞', '招新'],
            validatorPass: true,
            maxSteps: 14,
        },
    },
    {
        id: 'poster_activity_promo',
        name: '活动宣传海报',
        prompt: '做一个校园音乐节宣传海报，包含活动名称、时间和地点',
        canvasStyle: { ...DEFAULT_CANVAS },
        initialCanvas: [],
        expected: {
            minComponents: 3,
            requireComponents: ['VText'],
            requireText: ['音乐节', '时间', '地点'],
            validatorPass: true,
            maxSteps: 14,
        },
    },
    {
        id: 'form_registration',
        name: '社团报名表',
        prompt: '做一个社团报名表页面，包含姓名、联系方式字段和一个提交按钮',
        canvasStyle: { ...DEFAULT_CANVAS },
        initialCanvas: [],
        expected: {
            minComponents: 3,
            requireComponents: ['VText', 'VButton'],
            requireText: ['报名', '姓名', '联系'],
            validatorPass: true,
            maxSteps: 14,
        },
    },
    {
        id: 'edit_title_font',
        name: '修改标题字号',
        prompt: '把页面上的主标题字号改大一些，突出一点',
        canvasStyle: { ...DEFAULT_CANVAS },
        initialCanvas: [
            {
                id: 'title_1',
                component: 'VText',
                label: '主标题',
                propValue: '招新海报',
                style: {
                    width: 300, height: 60, top: 60, left: 37,
                    rotate: 0, opacity: 1, fontSize: 24, fontWeight: 700,
                    lineHeight: '', letterSpacing: 0, textAlign: 'center',
                    color: '#333', backgroundColor: '', borderColor: '',
                    borderWidth: 0, borderStyle: 'solid', borderRadius: '', padding: 4,
                },
                parentId: null, slot: 'default', zIndex: 1,
                animations: [], events: {}, groupStyle: {}, isLock: false,
                collapseName: 'style', linkage: { duration: 0, data: [] },
            },
            {
                id: 'btn_1',
                component: 'VButton',
                label: '报名按钮',
                propValue: '立即报名',
                style: {
                    width: 200, height: 48, top: 400, left: 87,
                    rotate: 0, opacity: 1, fontSize: 18, fontWeight: 400,
                    lineHeight: '', letterSpacing: 0, textAlign: 'center',
                    color: '#fff', backgroundColor: '#409eff', borderColor: '',
                    borderWidth: 0, borderStyle: 'solid', borderRadius: '8', padding: 4,
                },
                parentId: null, slot: 'default', zIndex: 2,
                animations: [], events: {}, groupStyle: {}, isLock: false,
                collapseName: 'style', linkage: { duration: 0, data: [] },
            },
        ],
        expected: {
            minComponents: 2,
            requireComponents: ['VText'],
            requireText: [],
            // 期望：标题字号比初始大（>=28），且不改变画布结构
            titleFontSizeMin: 28,
            validatorPass: true,
            maxSteps: 8,
        },
    },
    {
        id: 'delete_component',
        name: '删除组件',
        prompt: '把页面上的图片删掉',
        canvasStyle: { ...DEFAULT_CANVAS },
        initialCanvas: [
            {
                id: 'title_1',
                component: 'VText',
                label: '标题',
                propValue: '页面标题',
                style: {
                    width: 300, height: 50, top: 40, left: 37,
                    rotate: 0, opacity: 1, fontSize: 24, fontWeight: 700,
                    lineHeight: '', letterSpacing: 0, textAlign: 'center',
                    color: '#333', backgroundColor: '', borderColor: '',
                    borderWidth: 0, borderStyle: 'solid', borderRadius: '', padding: 4,
                },
                parentId: null, slot: 'default', zIndex: 1,
                animations: [], events: {}, groupStyle: {}, isLock: false,
                collapseName: 'style', linkage: { duration: 0, data: [] },
            },
            {
                id: 'pic_1',
                component: 'Picture',
                label: '配图',
                propValue: { url: 'https://placehold.co/300x200', flip: { horizontal: false, vertical: false } },
                style: {
                    width: 300, height: 200, top: 200, left: 37,
                    rotate: 0, opacity: 1, fontSize: 14, fontWeight: 400,
                    lineHeight: '', letterSpacing: 0, textAlign: 'center',
                    color: '#333', backgroundColor: '', borderColor: '',
                    borderWidth: 0, borderStyle: 'solid', borderRadius: '', padding: 4,
                },
                parentId: null, slot: 'default', zIndex: 2,
                animations: [], events: {}, groupStyle: {}, isLock: false,
                collapseName: 'style', linkage: { duration: 0, data: [] },
            },
        ],
        expected: {
            minComponents: 1,
            // 期望：Picture 组件被删除
            forbidComponents: ['Picture'],
            validatorPass: true,
            maxSteps: 6,
        },
    },
    {
        id: 'layout_center_focus',
        name: '居中聚焦布局',
        prompt: '用居中聚焦的布局重新排一下页面',
        canvasStyle: { ...DEFAULT_CANVAS },
        initialCanvas: [
            {
                id: 't1',
                component: 'VText',
                label: '标题',
                propValue: '活动标题',
                style: {
                    width: 200, height: 40, top: 0, left: 0,
                    rotate: 0, opacity: 1, fontSize: 24, fontWeight: 700,
                    lineHeight: '', letterSpacing: 0, textAlign: 'center',
                    color: '#333', backgroundColor: '', borderColor: '',
                    borderWidth: 0, borderStyle: 'solid', borderRadius: '', padding: 4,
                },
                parentId: null, slot: 'default', zIndex: 1,
                animations: [], events: {}, groupStyle: {}, isLock: false,
                collapseName: 'style', linkage: { duration: 0, data: [] },
            },
            {
                id: 't2',
                component: 'VText',
                label: '正文',
                propValue: '详情说明',
                style: {
                    width: 300, height: 60, top: 0, left: 0,
                    rotate: 0, opacity: 1, fontSize: 16, fontWeight: 400,
                    lineHeight: '', letterSpacing: 0, textAlign: 'center',
                    color: '#333', backgroundColor: '', borderColor: '',
                    borderWidth: 0, borderStyle: 'solid', borderRadius: '', padding: 4,
                },
                parentId: null, slot: 'default', zIndex: 2,
                animations: [], events: {}, groupStyle: {}, isLock: false,
                collapseName: 'style', linkage: { duration: 0, data: [] },
            },
        ],
        expected: {
            minComponents: 2,
            requireComponents: ['VText'],
            // 期望：布局被重新排布，标题水平居中（left 接近画布中心）
            layoutApplied: true,
            centeredLeftTolerance: 30,
            validatorPass: true,
            maxSteps: 8,
        },
    },
    {
        id: 'empty_canvas_vague',
        name: '空画布模糊需求（应询问方向）',
        prompt: '做个海报',
        canvasStyle: { ...DEFAULT_CANVAS },
        initialCanvas: [],
        expected: {
            // 模糊需求应触发初始方向确认（ask_user），而非直接瞎生成
            requireInitialChoice: true,
            minComponents: 0,
            validatorPass: false,
            maxSteps: 3,
        },
    },
]

/**
 * 获取任务集
 * @returns {import('./eval.types.js').EvalTask[]}
 */
export function getEvalTasks() {
    return EVAL_TASKS
}

/**
 * 按 id 获取任务
 * @param {string} id
 * @returns {import('./eval.types.js').EvalTask|undefined}
 */
export function getEvalTask(id) {
    return EVAL_TASKS.find(task => task.id === id)
}
