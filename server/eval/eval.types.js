/**
 * Agent Eval 类型定义（JSDoc for ESM）
 */

/**
 * @typedef {Object} EvalExpectation
 * @property {number} [minComponents] — 画布组件数下限
 * @property {string[]} [requireComponents] — 必须出现的组件类型集合
 * @property {string[]} [requireText] — 必须出现在某文本组件 propValue 中的关键字（任一命中即满足）
 * @property {string[]} [forbidComponents] — 不得出现的组件类型集合
 * @property {boolean} [validatorPass] — 完成时画布必须通过 validateCanvas（无 error）
 * @property {number} [maxSteps] — 允许的最大工具步数（防失控）
 * @property {number} [titleFontSizeMin] — 标题字号下限（编辑类任务）
 * @property {boolean} [requireInitialChoice] — 模糊需求应触发初始方向确认
 * @property {boolean} [layoutApplied] — 应应用布局（组件被重新排布）
 * @property {number} [centeredLeftTolerance] — 标题水平居中的容差（px）
 */

/**
 * @typedef {Object} EvalTask
 * @property {string} id
 * @property {string} name
 * @property {string} prompt
 * @property {import('../canvas.types.js').CanvasStyleData} canvasStyle
 * @property {import('../canvas.types.js').ComponentData[]} initialCanvas
 * @property {EvalExpectation} expected
 */

/**
 * @typedef {Object} EvalStepRecord
 * @property {string} type — tool_call / tool_result / ask_user / done / user_input
 * @property {string} [toolName]
 * @property {string} [title]
 * @property {string} [description]
 * @property {string} [status] — success / error / pending
 * @property {string} [errorCode]
 */

/**
 * @typedef {Object} EvalRunResult
 * @property {string} taskId
 * @property {string} taskName
 * @property {boolean} pass
 * @property {number} score — 0~100 细粒度得分
 * @property {Array<{code:string,message:string}>} failures — 未通过的期望项
 * @property {Array<{code:string,message:string}>} passedChecks — 通过的检查项
 * @property {import('../canvas.types.js').ComponentData[]} finalCanvas
 * @property {import('../canvas.types.js').CanvasStyleData} canvasStyle
 * @property {EvalStepRecord[]} steps
 * @property {number} durationMs
 * @property {{promptTokens:number,completionTokens:number,totalTokens:number}|null} tokenUsage
 * @property {string} [provider]
 * @property {string} [error] — 运行异常信息（失败但非期望项）
 */

/**
 * @typedef {Object} EvalReport
 * @property {string} mode — mock / live
 * @property {string} [provider]
 * @property {string} createdAt
 * @property {number} total
 * @property {number} passed
 * @property {number} passRate — 0~1
 * @property {number} avgScore
 * @property {number} totalDurationMs
 * @property {number} totalTokens
 * @property {EvalRunResult[]} results
 */

export {}
