/**
 * 简易 nanoid 实现（服务端用，避免额外依赖）
 */
import crypto from 'crypto'

const ALPHABET = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict'

export function nanoid(size = 8) {
    const bytes = crypto.randomBytes(size)
    let id = ''
    for (let i = 0; i < size; i++) {
        id += ALPHABET[bytes[i] & 63]
    }
    return id
}
