import { ref } from 'vue'
import { useStore } from '@/store'

/**
 * 面板切换 composable
 * 管理左右侧面板的显示/隐藏状态
 */
export function usePanelToggle(): {
  leftList: ReturnType<typeof ref<boolean>>
  isShowLeft: () => void
  isShowRight: () => void
  } {
    const store = useStore()

    const leftList = ref(true)

    function isShowLeft(): void {
        leftList.value = !leftList.value
    }

    function isShowRight(): void {
        store.toggleRightList()
    }

    return { leftList, isShowLeft, isShowRight }
}
