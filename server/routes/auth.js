import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { JWT_SECRET } from '../middleware/auth.js'

const router = Router()

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body

        // 校验
        if (!username || !email || !password) {
            return res.status(400).json({ error: '用户名、邮箱和密码不能为空' })
        }
        if (password.length < 6) {
            return res.status(400).json({ error: '密码至少6位' })
        }

        // 检查重复
        const existing = await User.findOne({ $or: [{ username }, { email }] })
        if (existing) {
            const field = existing.username === username ? '用户名' : '邮箱'
            return res.status(409).json({ error: `该${field}已被注册` })
        }

        // 加密密码
        const hashed = await bcrypt.hash(password, 10)

        const user = await User.create({ username, email, password: hashed })

        // 签发 token
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        })

        res.status(201).json({ token, user })
    } catch (err) {
        console.error('[register]', err)
        res.status(500).json({ error: '注册失败' })
    }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body

        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' })
        }

        // 支持用户名或邮箱登录
        const user = await User.findOne({
            $or: [{ username }, { email: username }],
        })
        if (!user) {
            return res.status(401).json({ error: '用户名或密码错误' })
        }

        const match = await bcrypt.compare(password, user.password)
        if (!match) {
            return res.status(401).json({ error: '用户名或密码错误' })
        }

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        })

        res.json({ token, user })
    } catch (err) {
        console.error('[login]', err)
        res.status(500).json({ error: '登录失败' })
    }
})

export default router