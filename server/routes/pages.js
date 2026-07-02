import { Router } from 'express'
import crypto from 'crypto'
import Page from '../models/Page.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

// 所有页面路由需要认证
router.use(authMiddleware)

// GET /api/pages - 获取用户的所有页面
router.get('/', async (req, res) => {
    try {
        const pages = await Page.find({ userId: req.userId })
            .select('title description createdAt updatedAt isPublic')
            .sort({ updatedAt: -1 })
        res.json({ pages })
    } catch (err) {
        console.error('[pages list]', err)
        res.status(500).json({ error: '获取页面列表失败' })
    }
})

// POST /api/pages - 创建页面
router.post('/', async (req, res) => {
    try {
        const { title, description, componentData, canvasStyle } = req.body
        const page = await Page.create({
            title: title || '未命名页面',
            description: description || '',
            userId: req.userId,
            componentData: componentData || [],
            canvasStyle: canvasStyle || undefined,
        })
        res.status(201).json({ page })
    } catch (err) {
        console.error('[page create]', err)
        res.status(500).json({ error: '创建页面失败' })
    }
})

// GET /api/pages/:id - 获取页面详情
router.get('/:id', async (req, res) => {
    try {
        const page = await Page.findOne({ _id: req.params.id, userId: req.userId })
        if (!page) {
            return res.status(404).json({ error: '页面不存在' })
        }
        res.json({ page })
    } catch (err) {
        console.error('[page get]', err)
        res.status(500).json({ error: '获取页面失败' })
    }
})

// PUT /api/pages/:id - 更新页面
router.put('/:id', async (req, res) => {
    try {
        const { title, description, componentData, canvasStyle } = req.body
        const page = await Page.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            {
                ...(title !== undefined && { title }),
                ...(description !== undefined && { description }),
                ...(componentData !== undefined && { componentData }),
                ...(canvasStyle !== undefined && { canvasStyle }),
                updatedAt: new Date(),
            },
            { new: true },
        )
        if (!page) {
            return res.status(404).json({ error: '页面不存在' })
        }
        res.json({ page })
    } catch (err) {
        console.error('[page update]', err)
        res.status(500).json({ error: '更新页面失败' })
    }
})

// DELETE /api/pages/:id - 删除页面
router.delete('/:id', async (req, res) => {
    try {
        const page = await Page.findOneAndDelete({ _id: req.params.id, userId: req.userId })
        if (!page) {
            return res.status(404).json({ error: '页面不存在' })
        }
        res.json({ message: '页面已删除' })
    } catch (err) {
        console.error('[page delete]', err)
        res.status(500).json({ error: '删除页面失败' })
    }
})

// POST /api/pages/:id/share - 生成分享链接
router.post('/:id/share', async (req, res) => {
    try {
        const page = await Page.findOne({ _id: req.params.id, userId: req.userId })
        if (!page) {
            return res.status(404).json({ error: '页面不存在' })
        }

        // 生成或复用分享 token
        if (!page.shareToken) {
            page.shareToken = crypto.randomBytes(16).toString('hex')
            page.isPublic = true
            await page.save()
        }

        res.json({
            shareToken: page.shareToken,
            shareUrl: `${req.protocol}://${req.get('host')}/api/shared/${page.shareToken}`,
        })
    } catch (err) {
        console.error('[page share]', err)
        res.status(500).json({ error: '分享失败' })
    }
})

// DELETE /api/pages/:id/share - 取消分享
router.delete('/:id/share', async (req, res) => {
    try {
        const page = await Page.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            { shareToken: null, isPublic: false },
            { new: true },
        )
        if (!page) {
            return res.status(404).json({ error: '页面不存在' })
        }
        res.json({ message: '已取消分享' })
    } catch (err) {
        console.error('[page unshare]', err)
        res.status(500).json({ error: '取消分享失败' })
    }
})

export default router