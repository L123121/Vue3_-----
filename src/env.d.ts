/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

// Element Plus 全局类型
declare module 'element-plus'

// ace-builds 类型声明
declare module 'ace-builds' {
  export const config: {
    set(key: string, value: string): void
  }
  export function edit(el: string | HTMLElement, options?: Record<string, unknown>): Ace.Editor
  export namespace Ace {
    interface Editor {
      setValue(value: string): void
      getValue(): string
      setTheme(theme: string): void
      setSession(session: EditSession): void
      getSession(): EditSession
      on(event: string, callback: () => void): void
      destroy(): void
      execCommand(command: string): void
    }
    interface EditSession {
      setMode(mode: string): void
      getValue(): string
      on(event: string, callback: () => void): void
    }
  }
}

// 扩展 Window 接口
interface Window {
  ace: unknown
}

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  readonly VITE_WS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
