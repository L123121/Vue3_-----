<template>
    <div class="dashboard">
        <!-- 顶部导航 -->
        <header class="header">
            <div class="header-left">
                <h1 class="logo">低代码平台</h1>
            </div>
            <div class="header-right">
                <span class="welcome">欢迎, {{ auth.username }}</span>
                <el-button size="small" @click="handleLogout">退出</el-button>
            </div>
        </header>

        <main class="main">
            <!-- 操作栏 -->
            <div class="actions">
                <h2>我的页面</h2>
                <el-button type="primary" :icon="Plus" @click="createPage">
                    新建页面
                </el-button>
            </div>

            <!-- 页面列表 -->
            <div v-if="loading" class="loading">
                <el-skeleton :rows="3" animated />
            </div>

            <div v-else-if="pages.length === 0" class="empty">
                <el-empty description="还没有页面，创建一个吧">
                    <el-button type="primary" :icon="Plus" @click="createPage">
                        新建页面
                    </el-button>
                </el-empty>
            </div>

            <div v-else class="page-grid">
                <div
                    v-for="page in pages"
                    :key="page._id"
                    class="page-card"
                    @click="openPage(page._id)"
                >
                    <div class="card-body">
                        <div class="card-title">{{ page.title }}</div>
                        <div class="card-desc">{{ page.description || '暂无描述' }}</div>
                    </div>
                    <div class="card-footer">
                        <span class="date">{{ formatDate(page.updatedAt) }}</span>
                        <div class="card-actions" @click.stop>
                            <el-tooltip v-if="page.isPublic" content="已分享" placement="top">
                                <el-button text :icon="Share" size="small" @click="copyShareLink(page._id)" />
                            </el-tooltip>
                            <el-tooltip content="分享" placement="top">
                                <el-button text :icon="Share" size="small" @click="sharePage(page._id)" />
                            </el-tooltip>
                            <el-popconfirm
                                title="确定删除这个页面吗？"
                                confirm-button-text="删除"
                                @confirm="deletePage(page._id)"
                            >
                                <template #reference>
                                    <el-button text type="danger" :icon="Delete" size="small" />
                                </template>
                            </el-popconfirm>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Share, Delete } from '@element-plus/icons-vue'
import { useAuthStore } from '@/store/auth'
import { pagesApi } from '@/utils/api'

const router = useRouter()
const auth = useAuthStore()

const pages = ref<any[]>([])
const loading = ref(true)

async function fetchPages() {
    loading.value = true
    try {
        const res = await pagesApi.list()
        pages.value = res.pages
    } catch (e: any) {
        ElMessage.error(e.message)
    } finally {
        loading.value = false
    }
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function openPage(id: string) {
    router.push(`/editor/${id}`)
}

async function createPage() {
    try {
        const res = await pagesApi.create({ title: '未命名页面' })
        router.push(`/editor/${res.page._id}`)
    } catch (e: any) {
        ElMessage.error(e.message)
    }
}

async function deletePage(id: string) {
    try {
        await pagesApi.delete(id)
        ElMessage.success('已删除')
        pages.value = pages.value.filter(p => p._id !== id)
    } catch (e: any) {
        ElMessage.error(e.message)
    }
}

async function sharePage(id: string) {
    try {
        const res = await pagesApi.share(id)
        await copyToClipboard(res.shareUrl)
        ElMessage.success('分享链接已复制到剪贴板')
        // 刷新列表更新分享状态
        await fetchPages()
    } catch (e: any) {
        ElMessage.error(e.message)
    }
}

async function copyShareLink(id: string) {
    try {
        const res = await pagesApi.share(id)
        await copyToClipboard(res.shareUrl)
        ElMessage.success('分享链接已复制')
    } catch (e: any) {
        ElMessage.error(e.message)
    }
}

async function copyToClipboard(text: string) {
    try {
        await navigator.clipboard.writeText(text)
    } catch {
        // fallback
        const ta = document.createElement('textarea')
        ta.value = text
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
    }
}

function handleLogout() {
    auth.logout()
    router.push('/login')
}

onMounted(() => {
    fetchPages()
})
</script>

<style lang="scss" scoped>
.dashboard {
    min-height: 100vh;
    background: #f5f7fa;
}

.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 32px;
    height: 60px;
    background: #fff;
    border-bottom: 1px solid #e4e7ed;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);

    .logo {
        font-size: 20px;
        font-weight: 700;
        color: #333;
        margin: 0;
    }

    .header-right {
        display: flex;
        align-items: center;
        gap: 12px;

        .welcome {
            font-size: 14px;
            color: #666;
        }
    }
}

.main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px 16px;
}

.actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;

    h2 {
        font-size: 22px;
        font-weight: 600;
        color: #333;
        margin: 0;
    }
}

.loading {
    padding: 40px;
    background: #fff;
    border-radius: 8px;
}

.empty {
    padding: 80px 0;
}

.page-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
}

.page-card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    }

    .card-body {
        padding: 20px;
        flex: 1;

        .card-title {
            font-size: 16px;
            font-weight: 600;
            color: #333;
            margin-bottom: 8px;
        }

        .card-desc {
            font-size: 13px;
            color: #999;
            line-height: 1.4;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
    }

    .card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 20px;
        border-top: 1px solid #f0f0f0;

        .date {
            font-size: 12px;
            color: #bbb;
        }

        .card-actions {
            display: flex;
            gap: 4px;
        }
    }
}
</style>