<template>
    <div class="auth-page">
        <div class="auth-card">
            <div class="auth-header">
                <h1 class="logo">
                    低代码平台
                </h1>
                <p class="subtitle">
                    登录到您的账户
                </p>
            </div>

            <el-form
                ref="formRef"
                :model="form"
                :rules="rules"
                label-width="0"
                size="large"
                @submit.prevent="handleLogin"
            >
                <el-form-item prop="username">
                    <el-input
                        v-model="form.username"
                        placeholder="用户名或邮箱"
                        :prefix-icon="User"
                    />
                </el-form-item>

                <el-form-item prop="password">
                    <el-input
                        v-model="form.password"
                        type="password"
                        placeholder="密码"
                        :prefix-icon="Lock"
                        show-password
                    />
                </el-form-item>

                <el-form-item>
                    <el-button
                        type="primary"
                        native-type="submit"
                        :loading="loading"
                        class="submit-btn"
                        size="large"
                    >
                        {{ loading ? '登录中...' : '登 录' }}
                    </el-button>
                </el-form-item>
            </el-form>

            <div class="auth-footer">
                还没有账户？
                <router-link to="/register" class="link">
                    立即注册
                </router-link>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '@/store/auth'
import { getErrorMessage } from '@/utils/api'

const router = useRouter()
const auth = useAuthStore()

const formRef = ref()
const loading = ref(false)
const form = reactive({
    username: '',
    password: '',
})
const rules = {
    username: [{ required: true, message: '请输入用户名或邮箱', trigger: 'blur' }],
    password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleLogin() {
    if (!formRef.value) return
    await formRef.value.validate(async (valid: boolean) => {
        if (!valid) return
        loading.value = true
        try {
            await auth.login({ username: form.username, password: form.password })
            ElMessage.success('登录成功')
            router.push('/dashboard')
        } catch (e: unknown) {
            ElMessage.error(getErrorMessage(e))
        } finally {
            loading.value = false
        }
    })
}
</script>

<style lang="scss" scoped>
.auth-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.auth-card {
    width: 400px;
    padding: 40px;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.auth-header {
    text-align: center;
    margin-bottom: 32px;

    .logo {
        font-size: 28px;
        font-weight: 700;
        color: #333;
        margin: 0 0 8px;
    }

    .subtitle {
        color: #999;
        font-size: 14px;
        margin: 0;
    }
}

.submit-btn {
    width: 100%;
}

.auth-footer {
    text-align: center;
    font-size: 14px;
    color: #999;
    margin-top: 16px;

    .link {
        color: #409eff;
        text-decoration: none;
        font-weight: 500;

        &:hover {
            text-decoration: underline;
        }
    }
}
</style>
