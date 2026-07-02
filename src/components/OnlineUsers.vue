<template>
    <div class="online-users">
        <div class="header">
            <span class="title">在线协作</span>
            <span class="count">{{ users.length }} 人</span>
        </div>
        <div class="user-list">
            <div v-for="u in users" :key="u.clientId" class="user-item">
                <span class="avatar" :style="{ background: u.color }">
                    {{ u.name.charAt(0) }}
                </span>
                <span class="name">{{ u.name }}</span>
                <span v-if="u.isSelf" class="self-tag">我</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
/**
 * 在线用户列表
 *
 * 订阅 awareness,展示同房间所有在线用户(含自己)。
 * 用于协同场景的可视化(让用户感知"有人在和我一起编辑")。
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { getCollab } from '@/collab'

interface UserEntry {
    clientId: number
    name: string
    color: string
    isSelf: boolean
}

const users = ref<UserEntry[]>([])
let unsub: (() => void) | null = null

onMounted(() => {
    const collab = getCollab()
    if (!collab) return

    const update = (): void => {
        const list: UserEntry[] = [
            {
                clientId: collab.awareness.localUser ? 0 : 0,
                name: collab.awareness.localUser.name,
                color: collab.awareness.localUser.color,
                isSelf: true,
            },
        ]
        for (const r of collab.awareness.getRemoteStates()) {
            list.push({
                clientId: r.clientId,
                name: r.state.user.name,
                color: r.state.user.color,
                isSelf: false,
            })
        }
        users.value = list
    }

    update()
    unsub = collab.awareness.onChange(() => update())
})

onUnmounted(() => {
    unsub?.()
})
</script>

<style lang="scss" scoped>
.online-users {
    padding: 8px 12px;

    .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;

        .title {
            font-size: 13px;
            font-weight: 600;
        }

        .count {
            font-size: 12px;
            color: var(--el-text-color-secondary, #909399);
        }
    }

    .user-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .user-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 0;
        font-size: 13px;

        .avatar {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            color: #fff;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .name {
            flex: 1;
        }

        .self-tag {
            font-size: 11px;
            color: var(--el-text-color-secondary, #909399);
            border: 1px solid var(--el-border-color, #dcdfe6);
            border-radius: 3px;
            padding: 0 4px;
        }
    }
}
</style>
