<template>
    <div class="remote-cursors" aria-hidden="true">
        <div
            v-for="r in remotes"
            :key="r.clientId"
            class="remote-cursor"
            :style="{
                transform: `translate(${r.cursor.x}px, ${r.cursor.y}px)`,
                color: r.state.user.color,
            }"
        >
            <svg
                class="cursor-arrow"
                viewBox="0 0 16 16"
                width="20"
                height="20"
            >
                <path
                    d="M1 1 L1 13 L5 9 L8 15 L10 14 L7 8 L13 8 Z"
                    :fill="r.state.user.color"
                    stroke="#fff"
                    stroke-width="1"
                />
            </svg>
            <span class="cursor-label" :style="{ background: r.state.user.color }">
                {{ r.state.user.name }}
            </span>
        </div>
    </div>
</template>

<script setup lang="ts">
/**
 * 远端光标渲染
 *
 * 订阅 awareness 变化,渲染同房间其他用户的光标位置与姓名。
 * 光标坐标基于画布编辑区(editorEl)的相对坐标,由 Editor 广播时换算。
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { getCollab, type AwarenessState } from '@/collab'

interface RemoteEntry {
    clientId: number
    cursor: { x: number; y: number }
    state: AwarenessState
}

const remotes = ref<RemoteEntry[]>([])
let unsub: (() => void) | null = null

onMounted(() => {
    const collab = getCollab()
    if (!collab) return

    const update = (): void => {
        remotes.value = collab.awareness
            .getRemoteStates()
            .filter(r => r.state.cursor !== null)
            .map(r => ({
                clientId: r.clientId,
                cursor: r.state.cursor as { x: number; y: number },
                state: r.state,
            }))
    }

    update()
    unsub = collab.awareness.onChange(() => update())
})

onUnmounted(() => {
    unsub?.()
})
</script>

<style lang="scss" scoped>
.remote-cursors {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
    overflow: hidden;
}

.remote-cursor {
    position: absolute;
    top: 0;
    left: 0;
    transition: transform 0.05s linear;
    will-change: transform;
}

.cursor-arrow {
    display: block;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.cursor-label {
    position: absolute;
    top: 16px;
    left: 12px;
    padding: 1px 6px;
    border-radius: 3px;
    color: #fff;
    font-size: 11px;
    line-height: 1.4;
    white-space: nowrap;
    user-select: none;
}
</style>
