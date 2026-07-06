import type { ComponentData } from '@/types'

export function normalizeComponentLayerOrder(components: ComponentData[]): void {
    const hasCompleteZIndex = components.every(component => component.zIndex > 0)

    if (hasCompleteZIndex) {
        components
            .map((component, index) => ({ component, index }))
            .sort((a, b) => {
                if (a.component.zIndex === b.component.zIndex) return a.index - b.index
                return a.component.zIndex - b.component.zIndex
            })
            .forEach(({ component }, index) => {
                components[index] = component
            })
    }

    normalizeComponentZIndex(components)
}

export function normalizeComponentZIndex(components: ComponentData[]): void {
    components.forEach((component, index) => {
        component.zIndex = index + 1
    })
}

export function resolveLayerInsertIndex(length: number, index?: number): number {
    return index !== undefined && index >= 0 && index <= length ? index : length
}

export function moveArrayItem<T>(items: T[], from: number, to: number): T | null {
    if (from < 0 || from >= items.length) return null
    if (to < 0 || to >= items.length) return null
    if (from === to) return items[from]

    const [item] = items.splice(from, 1)
    items.splice(to, 0, item)
    return item
}
