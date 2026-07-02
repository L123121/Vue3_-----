import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'lowcode-jwt-secret-change-in-production'

/**
 * JWT 认证中间件
 * 从 Authorization header 或 cookie 中提取 token
 */
export function authMiddleware(req, res, next) {
    try {
        let token = null

        // 优先从 header 取
        const authHeader = req.headers.authorization
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1]
        }

        if (!token) {
            return res.status(401).json({ error: '未登录，请先登录' })
        }

        const decoded = jwt.verify(token, JWT_SECRET)
        req.userId = decoded.userId
        next()
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: '登录已过期，请重新登录' })
        }
        return res.status(401).json({ error: '认证失败' })
    }
}

export { JWT_SECRET }