/**
 * 画布相关类型定义（JSDoc for ESM）
 */

/**
 * @typedef {Object} ComponentStyle
 * @property {number} width
 * @property {number} height
 * @property {number} [top]
 * @property {number} [left]
 * @property {number} [rotate]
 * @property {number} [opacity]
 * @property {number} [fontSize]
 * @property {number} [fontWeight]
 * @property {string} [lineHeight]
 * @property {number} [letterSpacing]
 * @property {'left'|'center'|'right'} [textAlign]
 * @property {string} [color]
 * @property {string} [backgroundColor]
 * @property {string} [borderColor]
 * @property {number} [borderWidth]
 * @property {'solid'|'dashed'|'dotted'} [borderStyle]
 * @property {string} [borderRadius]
 * @property {number} [padding]
 */

/**
 * @typedef {Object} ComponentData
 * @property {string} id
 * @property {string} component
 * @property {string} label
 * @property {string} icon
 * @property {string|Object} propValue
 * @property {ComponentStyle} style
 * @property {string|null} parentId
 * @property {string} slot
 * @property {number} zIndex
 * @property {any[]} animations
 * @property {Record<string,string>} events
 * @property {Record<string,unknown>} groupStyle
 * @property {boolean} isLock
 * @property {string} collapseName
 * @property {Object} linkage
 */

/**
 * @typedef {Object} CanvasStyleData
 * @property {number} width
 * @property {number} height
 * @property {number} scale
 * @property {string} color
 * @property {number} opacity
 * @property {string} backgroundColor
 * @property {number} fontSize
 */

export {}
