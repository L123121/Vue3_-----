<template>
    <div class="version-history">
        <div class="header">
            <h3>版本历史</h3>
            <el-button type="primary" @click="showSaveDialog = true">
                <el-icon><Plus /></el-icon>
                保存版本
            </el-button>
        </div>

        <div class="version-list">
            <div v-if="versions.length === 0" class="empty">
                <el-icon :size="48">
                    <DocumentCopy />
                </el-icon>
                <p>暂无版本记录</p>
                <p class="tip">
                    点击上方按钮保存当前页面版本
                </p>
            </div>

            <div
                v-for="version in sortedVersions"
                :key="version.id"
                class="version-item"
            >
                <div class="version-info">
                    <div class="version-name">
                        <el-icon><Folder /></el-icon>
                        {{ version.name }}
                    </div>
                    <div class="version-meta">
                        <span class="time">{{ formatDate(version.createdAt) }}</span>
                        <span v-if="version.description" class="desc">{{ version.description }}</span>
                    </div>
                </div>
                <div class="version-actions">
                    <el-button size="small" @click="handleRestore(version.id)">
                        <el-icon><RefreshRight /></el-icon>
                        恢复
                    </el-button>
                    <el-button size="small" type="danger" @click="handleDelete(version.id)">
                        <el-icon><Delete /></el-icon>
                        删除
                    </el-button>
                </div>
            </div>
        </div>

        <!-- 保存版本弹窗 -->
        <el-dialog
            v-model="showSaveDialog"
            title="保存版本"
            width="400px"
            :close-on-click-modal="false"
        >
            <el-form :model="form" label-width="80px">
                <el-form-item label="版本名称" required>
                    <el-input
                        v-model="form.name"
                        placeholder="例如：v1.0 初始版本"
                        maxlength="50"
                        show-word-limit
                    />
                </el-form-item>
                <el-form-item label="版本描述">
                    <el-input
                        v-model="form.description"
                        type="textarea"
                        :rows="3"
                        placeholder="描述本次版本的主要变更"
                        maxlength="200"
                        show-word-limit
                    />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showSaveDialog = false">
                    取消
                </el-button>
                <el-button type="primary" :disabled="!form.name.trim()" @click="handleSave">
                    保存
                </el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useStore } from '@/store'
import { storeToRefs } from 'pinia'
import { Plus, DocumentCopy, Folder, RefreshRight, Delete } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import {
    saveVersion,
    restoreVersion,
    deleteVersion,
    loadVersionsFromStorage,
} from '@/composables/useVersionManager'

const store = useStore()
const { versions } = storeToRefs(store)

const showSaveDialog = ref(false)
const form = ref({
    name: '',
    description: '',
})

// 按时间倒序排列
const sortedVersions = computed(() => {
    return [...versions.value].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
})

function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
}

function handleSave(): void {
    saveVersion(form.value.name.trim(), form.value.description.trim())
    showSaveDialog.value = false
    form.value = { name: '', description: '' }
}

function handleRestore(versionId: string): void {
    ElMessageBox.confirm(
        '恢复版本将覆盖当前页面内容，是否继续？',
        '提示',
        {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
        },
    ).then(() => {
        restoreVersion(versionId)
    }).catch(() => {
    // 用户取消
    })
}

function handleDelete(versionId: string): void {
    ElMessageBox.confirm(
        '删除后无法恢复，是否继续？',
        '提示',
        {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
        },
    ).then(() => {
        deleteVersion(versionId)
    }).catch(() => {
    // 用户取消
    })
}

onMounted(() => {
    loadVersionsFromStorage()
})
</script>

<style lang="scss" scoped>
.version-history {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
  background-color: var(--main-bg-color);

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-color);

    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--text-color);
    }
  }

  .version-list {
    flex: 1;
    overflow-y: auto;

    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: var(--secondary-text-color);

      p {
        margin: 8px 0 0;
        font-size: 14px;
      }

      .tip {
        font-size: 12px;
        color: var(--placeholder-color);
      }
    }

    .version-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      margin-bottom: 8px;
      background-color: var(--card-bg-color);
      border-radius: 8px;
      border: 1px solid var(--border-color);
      transition: all 0.2s;

      &:hover {
        border-color: var(--primary-color);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }

      .version-info {
        flex: 1;
        min-width: 0;

        .version-name {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-color);
          margin-bottom: 4px;
        }

        .version-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;

          .time {
            font-size: 12px;
            color: var(--secondary-text-color);
          }

          .desc {
            font-size: 12px;
            color: var(--secondary-text-color);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      }

      .version-actions {
        display: flex;
        gap: 8px;
        margin-left: 12px;
      }
    }
  }
}
</style>
