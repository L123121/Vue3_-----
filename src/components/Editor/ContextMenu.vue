<template>
    <div v-show="menuShow" class="contextmenu" :style="{ top: menuTop + 'px', left: menuLeft + 'px' }">
        <ul @mouseup="handleMouseUp">
            <template v-if="curComponent">
                <template v-if="!curComponent.isLock">
                    <li @click="copy">
                        复制
                    </li>
                    <li @click="paste">
                        粘贴
                    </li>
                    <li @click="cut">
                        剪切
                    </li>
                    <li @click="deleteComponent">
                        删除
                    </li>
                    <li @click="lock">
                        锁定
                    </li>
                    <li @click="topComponent">
                        置顶
                    </li>
                    <li @click="bottomComponent">
                        置底
                    </li>
                    <li @click="upComponent">
                        上移
                    </li>
                    <li @click="downComponent">
                        下移
                    </li>
                </template>
                <li v-else @click="unlock">
                    解锁
                </li>
            </template>
            <li v-else @click="paste">
                粘贴
            </li>
        </ul>
    </div>
</template>

<script setup lang="ts">
import { useStore } from '@/store'
import { storeToRefs } from 'pinia'
import {
    cutWithCommand,
    pasteWithCommand,
    deleteComponentWithCommand,
    layerOperation,
} from '@/composables/useCommandActions'

const store = useStore()
const { menuTop, menuLeft, menuShow, curComponent } = storeToRefs(store)

function lock(): void {
    store.lock()
}

function unlock(): void {
    store.unlock()
}

// 点击菜单时不取消当前组件的选中状态
function handleMouseUp(): void {
    store.setClickComponentStatus(true)
}

function cut(): void {
    cutWithCommand()
}

function copy(): void {
    store.copy()
}

function paste(): void {
    pasteWithCommand(true)
}

function deleteComponent(): void {
    deleteComponentWithCommand()
}

function upComponent(): void {
    if (store.curComponent) {
        layerOperation(store.curComponent.id, 'up')
    }
}

function downComponent(): void {
    if (store.curComponent) {
        layerOperation(store.curComponent.id, 'down')
    }
}

function topComponent(): void {
    if (store.curComponent) {
        layerOperation(store.curComponent.id, 'top')
    }
}

function bottomComponent(): void {
    if (store.curComponent) {
        layerOperation(store.curComponent.id, 'bottom')
    }
}
</script>

<style lang="scss" scoped>
.contextmenu {
  position: absolute;
  z-index: 1000;

  ul {
    border: 1px solid var(--border-color, #e4e7ed);
    border-radius: 4px;
    background-color: var(--panel-bg, #fff);
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    box-sizing: border-box;
    margin: 0;
    padding: 6px 0;

    li {
      font-size: 14px;
      padding: 0 20px;
      position: relative;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--text-color, #606266);
      height: 34px;
      line-height: 34px;
      box-sizing: border-box;
      cursor: pointer;

      &:hover {
        background-color: var(--button-active-bg-color, #f5f7fa);
      }
    }
  }
}
</style>

