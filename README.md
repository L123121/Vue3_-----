# Vue3 低代码可视化页面搭建平台

<p align="center">
  <img src="https://img.shields.io/badge/Vue-3.2+-brightgreen.svg" alt="vue">
  <img src="https://img.shields.io/badge/Vite-4.x-blue.svg" alt="vite">
  <img src="https://img.shields.io/badge/Pinia-2.x-yellow.svg" alt="pinia">
  <img src="https://img.shields.io/badge/Element--Plus-2.x-green.svg" alt="element-plus">
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue.svg" alt="typescript">
  <img src="https://img.shields.io/badge/ECharts-5.x-orange.svg" alt="echarts">
  <img src="https://img.shields.io/badge/License-MIT-orange.svg" alt="license">
</p>

> 一个基于 **Vue 3** + **TypeScript** + **Vite** 的低代码可视化页面搭建平台，通过组件拖拽与配置化方式快速生成业务页面，支持复杂交互编辑与实时预览，应用于活动营销与落地页等高频页面构建场景，提供接近所见即所得的设计体验。

---

## 项目背景

### 什么是营销页面？

营销页面是指用于商业推广和用户转化的专题页面，常见类型包括：

| 类型 | 示例场景 |
| --- | --- |
| 活动页 | 双11大促、618购物节、周年庆典 |
| 落地页 | 新用户拉新、产品发布、限时优惠 |
| 专题页 | 品牌宣传、新品首发、节日营销 |

**痛点**：传统开发模式下，每次活动都需要前端手写代码，开发周期长、重复劳动多、上线效率低。

**解决方案**：本平台让运营人员通过拖拽组件即可快速生成页面，无需编写代码，大幅提升页面生产效率。

---

## 系统架构

平台采用经典的三栏式编辑器布局，类似在线 PPT 编辑器：

```
┌─────────────┬─────────────────────────┬─────────────┐
│             │                         │             │
│  组件面板    │       画布编辑区         │  属性配置区  │
│             │                         │             │
│  - 文本     │    ┌───────────────┐    │  - 样式     │
│  - 图片     │    │               │    │  - 属性     │
│  - 按钮     │    │   可拖拽组件   │    │  - 事件     │
│  - 表格     │    │               │    │  - 动画     │
│  - 图表     │    └───────────────┘    │  - 联动     │
│  - 图形     │                         │             │
│             │                         │             │
└─────────────┴─────────────────────────┴─────────────┘
```

### 核心模块

| 模块 | 功能描述 |
| --- | --- |
| **组件面板** | 提供文本、图片、按钮、表格、图表、图形等可拖拽组件 |
| **画布区域** | 支持组件拖动、缩放、旋转、多选、自动对齐等交互 |
| **属性面板** | 实时编辑组件样式、属性、事件绑定，双向联动更新 |
| **版本管理** | 支持页面版本保存、恢复、删除，方便回溯历史版本 |

---

## 功能特性

### 核心编辑器

| 功能 | 描述 |
| --- | --- |
| 无限画布 | 支持画布缩放，适应不同尺寸页面设计 |
| SVG 动态网格 | 提供可视化参考线，辅助组件定位 |
| 实时预览 | 编辑即所见，支持预览模式查看最终效果 |
| 自动吸附 | 组件靠近时自动对齐，提升排版效率 |
| 标线对齐 | 智能显示对齐辅助线，精确布局 |
| 撤销重做 | 命令模式双栈，支持命令合并，最多 50 步历史记录 |
| 暗黑模式 | 支持明暗主题切换，保护眼睛 |

### 组件库

| 组件类型 | 组件名称 | 功能描述 |
| --- | --- | --- |
| **基础组件** | VText | 文本组件，支持富文本编辑、动态数据绑定 |
| | VButton | 按钮组件，支持样式自定义、事件绑定 |
| | Picture | 图片组件，支持图片翻转、圆角设置 |
| | VTable | 表格组件，支持表头加粗、斑马纹样式 |
| **图形组件** | RectShape | 矩形组件，支持边框、背景色设置 |
| | CircleShape | 圆形组件，支持圆形/椭圆切换 |
| | LineShape | 直线组件，支持颜色、粗细调整 |
| **SVG 图形** | SVGStar | 星形组件，支持填充色、边框色设置 |
| | SVGTriangle | 三角形组件，支持自定义尺寸 |
| **高级组件** | VChart | ECharts 图表组件，支持柱状图、折线图、饼图等 |
| | Group | 组合组件，支持多组件组合/拆分 |

### 交互能力

| 功能 | 快捷键 | 描述 |
| --- | --- | --- |
| 拖拽位移 | 鼠标左键拖动 | 自由移动组件位置 |
| 八点缩放 | 拖拽控制点 | 八个方向调整组件大小 |
| 旋转控制 | 拖拽旋转手柄 | 自由旋转组件角度 |
| 多选操作 | Ctrl + 点击 | 框选或点选多个组件 |
| 图层调整 | - | 上移/下移/置顶/置底 |
| 锁定/解锁 | - | 防止误操作 |
| 复制粘贴 | Ctrl+C / Ctrl+V | 快速复制组件 |
| 删除组件 | Delete / Backspace | 删除选中组件 |

### 进阶功能

| 功能 | 描述 |
| --- | --- |
| **动画系统** | 集成 Animate.css，支持入场/离场动画，可配置时长、延迟、循环 |
| **事件绑定** | 支持点击跳转、消息提示、确认弹窗等事件 |
| **组件联动** | 组件间数据联动，一个组件触发另一个组件样式变化 |
| **数据请求** | 支持配置 API 请求，动态获取组件数据，支持定时刷新 |
| **右键菜单** | 提供快捷操作入口：复制、粘贴、删除、锁定、组合等 |
| **JSON 导入导出** | 一键导出页面 JSON 数据，导入时通过 Zod 运行时校验数据格式 |
| **版本管理** | 保存页面历史版本，支持版本恢复和删除 |

---

## 核心设计

### 1. 页面数据结构设计

这是本系统的核心设计思想：**页面不是 DOM，而是一棵 JSON 树**。

采用**扁平数组 + parentId** 作为主要数据结构描述页面与组件的层级关系（`componentData` 是一维数组，每个组件用 `parentId` 指向父组件，`null` 表示根级组件），通过 TypeScript 接口与枚举约束组件属性与交互行为，保障系统的类型安全与可扩展性。

> **关于组合组件 Group**：作为扁平结构的特例，`Group` 组件的 `propValue` 是一个 `ComponentData[]` 嵌套数组，用于在组合时保存子组件的快照。这是一种"主结构扁平、组合节点局部嵌套"的混合模型——日常渲染与图层管理走扁平数组 + parentId，组合/拆分操作通过 Group 的 `propValue` 嵌套数组承载子组件。拆分（Decompose）时子组件会被重新摊平回主数组并恢复各自的 parentId。

```typescript
// 页面数据结构示例
{
  "id": "page_001",
  "title": "双11活动页",
  "components": [
    {
      "id": "text_001",
      "component": "VText",
      "label": "标题文本",
      "style": {
        "position": "absolute",
        "top": 100,
        "left": 200,
        "width": 300,
        "height": 50,
        "fontSize": 24,
        "color": "#333333"
      },
      "propValue": "限时优惠",
      "animations": [],
      "events": {},
      "linkage": { duration: 0, data: [] }
    },
    {
      "id": "image_001",
      "component": "Picture",
      "style": { "top": 200, "left": 100, "width": 400, "height": 300 },
      "propValue": { "url": "https://example.com/banner.jpg", "flip": { "horizontal": false, "vertical": false } }
    }
  ]
}
```

**渲染原理**：Vue 通过 `<component :is="componentMap[item.component]" v-bind="item" />` 动态渲染组件，实现数据驱动视图。

### 2. 命令模式与撤销重做

将用户操作抽象为命令对象，维护撤销/重做双栈，支持命令合并与批量操作。

```typescript
// CommandManager 核心逻辑
class CommandManager {
  private undoStack: Command[] = []
  private redoStack: Command[] = []
  private readonly config = { maxStackSize: 50, mergeTimeWindow: 300 }

  execute(command: Command): void {
    // 命令合并：300ms 内的同类操作自动合并
    const lastCommand = this.undoStack[this.undoStack.length - 1]
    if (this.shouldMerge(lastCommand, command)) {
      const merged = lastCommand!.merge(command)
      this.undoStack[this.undoStack.length - 1] = merged
      merged.execute()
      this.redoStack = []
      return
    }

    command.execute()
    this.undoStack.push(command)
    this.redoStack = []

    if (this.undoStack.length > this.config.maxStackSize) {
      this.undoStack.shift()
    }
  }

  undo(): boolean {
    const command = this.undoStack.pop()
    if (!command) return false
    command.undo()
    this.redoStack.push(command)
    return true
  }

  redo(): boolean {
    const command = this.redoStack.pop()
    if (!command) return false
    command.redo()
    this.undoStack.push(command)
    return true
  }
}
```

### 3. 状态管理与双向联动

基于 Pinia 实现全局状态管理，属性面板与画布状态实时双向联动：

```
点击画布组件 → 更新 curComponent → 属性面板读取 store → 修改数据 → 自动驱动画布更新
```

### 4. 拖拽系统实现

核心思想：**把鼠标位移映射成组件坐标变化**，通过 RAF 节流 + DOM 直写实现高性能拖拽。

```typescript
// Shape.vue 拖拽核心逻辑（简化版）
function handleMouseDownOnShape(e: MouseEvent): void {
  const pos = { ...props.defaultStyle }
  let startY = e.clientY, startX = e.clientY
  let startTop = pos.top, startLeft = pos.left

  // RAF 节流：每帧只更新一次 store
  const throttledMove = createRAFThrottle((curX, curY) => {
    store.setShapeStyle({ top: startTop + (curY - startY), left: startLeft + (curX - startX) })
    // 重设基线，下一帧只计算增量偏移
    startY = curY; startX = curX
    shapeRef.value.style.transform = ''
  })

  const move = (moveEvent: MouseEvent) => {
    // 直接 DOM 操作：微量 transform，每帧 RAF 提交后归零
    shapeRef.value.style.transform = `translate(${deltaX}px, ${deltaY}px)`
    throttledMove(moveEvent.clientX, moveEvent.clientY)
  }

  const up = () => {
    // 鼠标释放 → 创建 MoveCommand 入栈（可撤销）
    store.moveComponent(props.element.id, oldStyle, newStyle)
  }
}
```

需要解决的问题：
- 画布缩放比例适配
- 元素自动吸附对齐
- 多选拖拽
- 边界限制
- 性能优化（RAF 节流、DOM 直写、命令合并）

### 5. 图层管理

模拟 CSS 的 z-index 管理，支持：
- 上移一层 / 下移一层
- 置顶 / 置底
- 锁定 / 解锁

### 6. 自动对齐

通过几何计算实现：
- 判断组件中心点/边缘差值
- 差值小于阈值时显示辅助线
- 自动吸附对齐

### 7. 版本管理

支持页面版本管理功能：
- **保存版本**：深拷贝当前页面快照，可添加版本名称和描述
- **恢复版本**：通过 ImportDataCommand 恢复（支持撤销）
- **删除版本**：清理不需要的历史版本
- **本地存储**：版本数据持久化到 localStorage

---

## 技术栈

| 技术 | 版本 | 作用 |
| --- | --- | --- |
| **Vue 3** | 3.2+ | 核心框架，使用 Composition API 开发，响应式渲染组件 |
| **TypeScript** | 5.x | 类型约束，保障 JSON 数据结构的类型安全与可扩展性 |
| **Pinia** | 2.x | 状态管理，管理画布数据、组件状态及命令历史 |
| **Vue Router** | 4.x | 路由管理，支持多页面编辑切换 |
| **Element Plus** | 2.x | UI 组件库，用于属性面板和侧边栏 |
| **Vite** | 4.x | 构建工具，极速的热更新体验 |
| **Zod** | 4.x | 运行时数据校验，校验导入的 JSON 数据结构 |
| **ECharts** | 5.x | 数据可视化支持 |
| **Animate.css** | - | 提供丰富的预置动画效果 |
| **Ace Editor** | 1.x | 代码编辑器，用于 JSON 数据编辑 |
| **html-to-image** | 1.x | 页面截图导出 |

---

## 技术难点解析

### 面试常见问题

**Q: 这个项目难在哪？**

1. **页面数据结构设计**：如何用 JSON 描述复杂页面结构，支持嵌套组件、动态属性
2. **操作抽象与历史记录**：命令模式的设计，如何处理连续操作、批量操作
3. **拖拽与坐标系统**：鼠标坐标到画布坐标的转换，缩放比例适配
4. **数据与 UI 实时一致性**：响应式更新、性能优化、避免循环依赖
5. **可扩展组件机制**：组件注册、动态加载、属性配置面板自动生成

### 核心能力总结

| 能力 | 描述 |
| --- | --- |
| 数据抽象 | 把页面抽象为 JSON 数据结构（Zod Schema + TypeScript 接口） |
| 操作抽象 | 把用户操作抽象为命令对象（Command Pattern + 命令合并） |
| 数据驱动 | 用响应式数据驱动可视化系统（Pinia + Vue 3 Reactivity） |
| 编辑体验 | 所见即所得编辑体验（RAF 节流 + DOM 直写 transform） |
| 架构设计 | Composable 关注点分离 + provide/inject 类型安全通信 |
| 数据校验 | 编译时 TypeScript + 运行时 Zod 双重保障 |

---

## 快速开始

### 环境要求

- **Node.js** >= 16.0.0
- **npm** >= 7.0.0 (或 pnpm / yarn)

### 安装与运行

```bash
# 克隆项目
git clone https://github.com/your-username/visual-drag-demo.git
cd visual-drag-demo

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build

# 类型检查
npm run type-check

# 代码检查
npm run lint
```

访问 `http://localhost:8080` 即可开始编辑。

---

## 项目结构

```text
src/
├── components/              # 编辑器核心 UI
│   ├── Editor/              # 画布渲染引擎
│   │   ├── index.vue        # 编辑器主入口
│   │   ├── Shape.vue        # 组件包装器（拖拽、缩放、旋转）
│   │   ├── MarkLine.vue     # 对齐辅助线
│   │   ├── Grid.vue         # SVG 网格背景
│   │   ├── Area.vue         # 框选区域
│   │   ├── ContextMenu.vue  # 右键菜单
│   │   ├── Preview.vue      # 预览模式
│   │   ├── AceEditor.vue    # JSON 编辑器
│   │   └── ComponentWrapper.vue  # 组件包装器
│   ├── Toolbar.vue          # 顶部工具栏
│   ├── ComponentList.vue    # 左侧组件列表
│   ├── RealTimeComponentList.vue # 图层列表
│   ├── CanvasAttr.vue       # 画布属性配置
│   ├── AnimationList.vue    # 动画列表
│   ├── AnimationSettingModal.vue # 动画设置弹窗
│   ├── EventList.vue        # 事件列表
│   ├── VersionHistory.vue   # 版本历史
│   └── Modal.vue            # 通用弹窗
├── custom-component/        # 低代码组件实现
│   ├── VText/               # 文本组件
│   │   ├── Component.vue    # 组件实现
│   │   └── Attr.vue         # 属性配置面板
│   ├── VButton/             # 按钮组件
│   ├── Picture/             # 图片组件
│   ├── RectShape/           # 矩形组件
│   ├── CircleShape/         # 圆形组件
│   ├── LineShape/           # 直线组件
│   ├── VTable/              # 表格组件
│   ├── VChart/              # 图表组件
│   ├── Group/               # 组合组件
│   ├── svgs/                # SVG 图形组件
│   │   ├── SVGStar/         # 星形
│   │   └── SVGTriangle/     # 三角形
│   ├── common/              # 组件通用配置
│   │   ├── CommonAttr.vue   # 通用属性面板
│   │   ├── OnEvent.vue      # 事件配置
│   │   ├── Request.vue      # 数据请求配置
│   │   └── Linkage.vue      # 组件联动配置
│   ├── component-list.ts    # 组件模板列表
│   └── index.ts             # 组件注册入口
├── composables/             # Composable 函数
│   ├── useAutoSave.ts       # 自动保存（脏标记 + 防抖）
│   ├── useDragDrop.ts       # 拖拽放置逻辑
│   ├── usePanelToggle.ts    # 面板切换状态
│   └── useEditorContext.ts  # 编辑器上下文（provide/inject）
├── store/                   # 状态管理
│   └── index.ts             # Pinia Store（画布数据、命令历史、版本管理）
├── types/                   # TypeScript 类型定义
│   └── index.ts             # 核心类型定义
├── schemas/                 # Zod Schema 定义
│   └── index.ts             # 运行时数据校验 Schema
├── commands/                # 命令模式实现
│   ├── CommandManager.ts    # 命令管理器（双栈 + 合并）
│   ├── BaseCommand.ts       # 命令基类
│   ├── MoveCommand.ts       # 移动命令（可合并）
│   ├── ResizeCommand.ts     # 缩放命令（可合并）
│   ├── RotateCommand.ts     # 旋转命令（可合并）
│   ├── AddComponentCommand.ts
│   ├── DeleteComponentCommand.ts
│   ├── LayerCommand.ts
│   ├── ComposeCommand.ts
│   ├── DecomposeCommand.ts
│   ├── PasteCommand.ts
│   ├── CutCommand.ts
│   ├── ClearCanvasCommand.ts
│   ├── ImportDataCommand.ts
│   ├── BatchCommand.ts
│   ├── index.ts
│   └── types.ts
├── utils/                   # 工具函数
│   ├── utils.ts             # 通用工具函数（deepCopy、swap 等）
│   ├── eventBus.ts          # 类型安全事件总线（EventMap 泛型）
│   ├── generateID.ts        # ID 生成器
│   ├── style.ts             # 样式计算
│   ├── translate.ts         # 坐标转换（旋转矩阵、缩放比例）
│   ├── calculateComponentPositionAndSize.ts # 八点缩放计算
│   ├── changeComponentsSizeWithScale.ts # 画布缩放适配
│   ├── performance.ts       # 性能工具（RAF 节流、视口裁剪）
│   ├── validation.ts        # Zod 校验工具函数
│   ├── request.ts           # 数据请求
│   ├── shortcutKey.ts       # 快捷键处理（使用 e.key）
│   ├── animationClassData.ts # 动画数据
│   ├── runAnimation.ts      # 动画执行
│   ├── events.ts            # 事件处理
│   └── decomposeComponent.ts # 组件拆分
├── styles/                  # 全局样式
│   ├── global.scss          # 全局样式
│   ├── dark.scss            # 暗黑模式
│   ├── animate.scss         # 动画样式
│   ├── variable.scss        # 样式变量
│   └── reset.css            # 样式重置
├── views/                   # 页面入口
│   └── Home.vue             # 主页面
├── router/                  # 路由配置
│   └── index.ts
├── App.vue                  # 根组件
├── main.ts                  # 入口文件
└── env.d.ts                 # 环境类型声明
```

---

## 核心类型定义

项目使用 TypeScript 定义了完整的类型系统，主要类型包括：

```typescript
// 组件数据结构
interface ComponentData {
  id: string
  component: string          // 组件类型
  label: string              // 组件标签
  icon: string               // 图标
  propValue: PropValue       // 组件属性值
  style: ComponentStyle      // 样式配置
  request?: RequestConfig    // 数据请求配置
  animations: Animation[]    // 动画列表
  events: Record<string, string>  // 事件配置
  groupStyle: Record<string, unknown>  // 组合样式
  isLock: boolean            // 是否锁定
  collapseName: string       // 折叠面板名称
  linkage: LinkageConfig     // 联动配置
}

// 版本管理
interface PageVersion {
  id: string
  name: string               // 版本名称
  description: string        // 版本描述
  snapshot: ComponentData[]  // 页面快照
  createdAt: string          // 创建时间
  thumbnail?: string         // 缩略图
}
```

完整类型定义请参考 `src/types/index.ts`。

---

## 扩展开发

### 添加新组件

1. 在 `src/custom-component/` 下创建组件目录
2. 创建 `Component.vue` 实现组件渲染
3. 创建 `Attr.vue` 实现属性配置面板
4. 在 `src/custom-component/component-list.ts` 中注册组件模板
5. 在 `src/custom-component/index.ts` 中导出组件

### 组件开发示例

```vue
<!-- Component.vue -->
<template>
  <div class="my-component" :style="style">
    {{ propValue }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentData } from '@/types'

const props = defineProps<{
  propValue: string
  style: Record<string, any>
}>()

const style = computed(() => ({
  width: `${props.style.width}px`,
  height: `${props.style.height}px`,
  // ...其他样式
}))
</script>
```

---

## 技术参考

如果你对实现原理感兴趣，可以参考以下技术文章：

- [可视化拖拽组件库一些技术要点原理分析](https://github.com/woai3c/Front-end-articles/issues/19)
- [可视化拖拽组件库一些技术要点原理分析（二）](https://github.com/woai3c/Front-end-articles/issues/20)
- [可视化拖拽组件库一些技术要点原理分析（三）](https://github.com/woai3c/Front-end-articles/issues/21)
- [可视化拖拽组件库一些技术要点原理分析（四）](https://github.com/woai3c/Front-end-articles/issues/33)
- [低代码与大语言模型的探索实践](https://github.com/woai3c/Front-end-articles/issues/45)

---

## 相关文档

- [TypeScript 迁移方案](./docs/TYPESCRIPT_MIGRATION.md) - 详细的 TypeScript 迁移指南

---

## License

[MIT](LICENSE)
