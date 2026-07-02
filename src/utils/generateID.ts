import { nanoid } from 'nanoid'

/**
 * 生成唯一 ID
 * 主要用于 Vue 的 diff 算法，为每个元素创建一个独一无二的 ID
 * @returns 唯一 ID 字符串
 */
export default function generateID(): string {
    return nanoid()
}
