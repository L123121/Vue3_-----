import { onMounted, onBeforeUnmount, type Ref } from 'vue'
import eventBus from '@/utils/eventBus'
import type { ComponentData, LinkageConfig } from '@/types'

interface UseOnEventProps {
  element: ComponentData
  linkage: LinkageConfig
}

/**
 * 组件事件联动 Hook
 * @param props 组件属性
 * @param elementRef 组件 DOM 引用
 */
export function useOnEvent(
    props: UseOnEventProps,
    elementRef: Ref<HTMLElement | null>,
): void {
    function changeStyle(data: LinkageConfig['data'] = []): void {
        data.forEach(item => {
            item.style.forEach(e => {
                if (e.key) {
                    const style = props.element.style as unknown as Record<string, string>
                    style[e.key] = e.value
                }
            })
        })
    }

    function onClick(componentId: string): void {
        const data = props.linkage.data.filter(
            item => item.id === componentId && item.event === 'v-click',
        )
        changeStyle(data)
    }

    function onHover(componentId: string): void {
        const data = props.linkage.data.filter(
            item => item.id === componentId && item.event === 'v-hover',
        )
        changeStyle(data)
    }

    onMounted(() => {
        const { data, duration } = props.linkage || {}
        if (data?.length) {
            if (elementRef.value) {
                elementRef.value.style.transition = `all ${duration}s`
            }
            eventBus.on('v-click', onClick)
            eventBus.on('v-hover', onHover)
        }
    })

    onBeforeUnmount(() => {
        if (props.linkage?.data?.length) {
            eventBus.off('v-click', onClick)
            eventBus.off('v-hover', onHover)
        }
    })
}
