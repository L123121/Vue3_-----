/**
 * 编辑器自定义事件
 */

interface EventFunctions {
  redirect: (url: string) => void
  alert: (msg: string) => void
}

/**
 * 验证重定向 URL 是否安全（阻止 javascript: 协议等）
 */
function isSafeRedirectUrl(url: string): boolean {
    try {
        const parsed = new URL(url, window.location.origin)
        return ['http:', 'https:'].includes(parsed.protocol) || url.startsWith('/')
    } catch {
        return false
    }
}

const events: EventFunctions = {
    redirect(url: string): void {
        if (url && isSafeRedirectUrl(url)) {
            window.open(url, '_blank', 'noopener,noreferrer')
        } else if (url) {
            console.warn('已阻止潜在的不安全重定向 URL:', url)
        }
    },

    alert(msg: string): void {
        if (msg) {
            // eslint-disable-next-line no-alert
            window.alert(msg)
        }
    },
}

/**
 * Vue 2 mixins 兼容层（已废弃，保留向后兼容）
 * @deprecated 请直接使用 events 对象
 */
const mixins = {
    methods: events,
}

interface EventListItem {
  key: string
  label: string
  event: (param: string) => void
  param: string
}

const eventList: EventListItem[] = [
    {
        key: 'redirect',
        label: '跳转事件',
        event: events.redirect,
        param: '',
    },
    {
        key: 'alert',
        label: 'alert 事件',
        event: events.alert,
        param: '',
    },
]

export { mixins, events, eventList }
