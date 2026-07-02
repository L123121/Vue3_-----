import type { Animation } from '@/types'

/**
 * 运行动画
 * @param $el 目标 DOM 元素
 * @param animations 动画配置数组
 */
export default async function runAnimation(
    $el: HTMLElement,
    animations: Animation[] = [],
): Promise<void> {
    const play = (animation: Animation): Promise<void> =>
        new Promise(resolve => {
            const { duration = 1000, type: value = '', infinite: isLoop } = animation
            const animationTime = duration / 1000 // 转换为秒

            $el.style.setProperty('--time', `${animationTime}s`)
            $el.classList.add(value, 'animated', utilsHandle(isLoop))

            const removeAnimation = () => {
                $el.removeEventListener('animationend', removeAnimation)
                $el.removeEventListener('animationcancel', removeAnimation)
                $el.classList.remove(value, 'animated', utilsHandle(isLoop))
                $el.style.removeProperty('--time')
                resolve()
            }

            $el.addEventListener('animationend', removeAnimation)
            $el.addEventListener('animationcancel', removeAnimation)
        })

    for (let i = 0, len = animations.length; i < len; i++) {
        await play(animations[i])
    }
}

/**
 * 处理循环动画类名
 * @param isLoop 是否循环
 * @returns 类名字符串
 */
function utilsHandle(isLoop: boolean): string {
    return isLoop ? 'infinite' : 'no-infinite'
}
