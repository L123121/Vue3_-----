/**
 * Agent 辅助函数 — 兼容性导出层
 *
 * 为保持向后兼容，所有函数委托到新拆分模块：
 *   - promptBuilder.js  → 系统提示词
 *   - outputParser.js   → LLM 输出解析
 *   - componentHelper.js → 组件标准化/校验
 *   - toolRegistry.js    → 工具定义
 *
 * 新代码请直接 import 对应模块。
 */

export { TOOLS } from './agent/toolRegistry.js'
export { buildSystemPrompt } from './agent/promptBuilder.js'
export { parseAgentOutput } from './agent/outputParser.js'
export { validateComponent, normalizeComponent } from './agent/componentHelper.js'
