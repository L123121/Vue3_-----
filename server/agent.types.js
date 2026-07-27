/**
 * Agent 类型定义（JSDoc for ESM）
 * @typedef {import('./canvas.types.js').ComponentData} ComponentData
 * @typedef {import('./canvas.types.js').CanvasStyleData} CanvasStyleData
 */

/**
 * @typedef {Object} AgentCard
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} [tag]
 * @property {string} [icon]
 */

/**
 * @typedef {Object} UserInput
 * @property {'card_select'|'free_text'} type
 * @property {string} value
 * @property {string} [cardId]
 */

/**
 * @typedef {Object} RoundRecord
 * @property {number} round
 * @property {string} dimension
 * @property {AgentCard[]} cards
 * @property {UserInput} userInput
 * @property {ComponentData[]} canvasAfter
 * @property {string} aiMessage
 */

/**
 * @typedef {Object} AgentSession
 * @property {string} id
 * @property {number} createdAt
 * @property {number} updatedAt
 * @property {RoundRecord[]} history
 * @property {Record<string,string>} decisions
 * @property {ComponentData[]} currentCanvas
 * @property {CanvasStyleData} canvasStyle
 * @property {string} currentDimension
 * @property {number} round
 * @property {'active'|'completed'|'expired'} status
 */

/**
 * @typedef {Object} PendingContext
 * @property {ComponentData[]} preview
 * @property {CanvasStyleData} canvasStyle
 * @property {string} currentDimension
 */

/**
 * @typedef {Object} AgentOutput
 * @property {string} dimension
 * @property {AgentCard[]} cards
 * @property {ComponentData[]} preview
 * @property {CanvasStyleData} canvasStyle
 * @property {string} message
 * @property {boolean} done
 * @property {string} [reasoning]
 */

export {}
