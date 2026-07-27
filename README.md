# Vue3 低代码可视化页面搭建平台

<p align="center">
  <img src="https://img.shields.io/badge/Vue-3.2.47-brightgreen.svg" alt="vue">
  <img src="https://img.shields.io/badge/Vite-6.1.0-blue.svg" alt="vite">
  <img src="https://img.shields.io/badge/TypeScript-5.7-blue.svg" alt="typescript">
  <img src="https://img.shields.io/badge/Pinia-2.x-yellow.svg" alt="pinia">
  <img src="https://img.shields.io/badge/Element--Plus-2.x-green.svg" alt="element-plus">
  <img src="https://img.shields.io/badge/Express-4.x-black.svg" alt="express">
</p>

基于 **Vue 3 + TypeScript + Vite** 的低代码页面编辑器，提供组件拖拽、属性配置、图层管理、撤销重做、JSON 导入导出、HTML 导出、版本历史、实时预览和 AI 页面生成能力。项目包含前端编辑器与 Express AI 服务端，适用于活动页、营销落地页、专题页等可视化搭建场景。

## 项目截图

项目根目录包含 `image.png`，可作为编辑器效果截图引用或替换为自己的演示图。

![低代码平台截图](./image.png)

## 核心功能

| 模块 | 当前实现 |
| --- | --- |
| 编辑器布局 | 顶部工具栏 + 左侧组件/图层面板 + 中间画布 + 右侧属性/动画/事件/命令面板 |
| 组件拖拽 | 组件从左侧面板拖入画布，支持拖动、缩放、旋转、框选、多选与画布缩放 |
| 属性配置 | 简单组件使用 `propConfigs` 自动渲染属性面板，复杂组件回退到独立 `Attr.vue` |
| 图层管理 | 支持图层列表、上移、下移、置顶、置底、锁定、解锁 |
| 命令系统 | 使用命令模式实现撤销、重做、组合、拆分、移动、缩放、旋转、导入、清空等操作 |
| 数据导入导出 | 支持 JSON 导入导出，导入时通过 Zod Schema 校验并可重新生成组件 ID |
| HTML 导出 | 通过 `exportHtml.ts` 生成静态 HTML，并使用 DOMPurify 做安全处理 |
| 预览与截图 | 支持编辑器内预览、独立 `/preview` 路由和截图导出入口 |
| 版本历史 | 支持保存、恢复、删除页面版本，版本快照保存在本地 |
| 本地持久化 | 当前项目文档保存到 IndexedDB，失败时降级 localStorage，并兼容迁移旧版 `canvasData` / `canvasStyle` |
| AI 页面生成 | 提供 AI Agent 面板，调用服务端 `/api/ai/agent/round` 进行多轮页面生成与编辑 |

## 编辑器结构

```text
┌───────────────────────────────────────────────┐
│ Toolbar：导入/导出/预览/保存/撤销/AI/主题/画布 │
├───────────────┬─────────────────┬─────────────┤
│ 左侧面板       │ 中间画布         │ 右侧面板     │
│ ComponentList │ Editor/Shape     │ 属性配置     │
│ 图层列表       │ Grid/MarkLine    │ 动画配置     │
│               │ ContextMenu      │ 事件配置     │
│               │ Preview          │ 命令时间线   │
└───────────────┴─────────────────┴─────────────┘
```

前端主页面位于 `src/views/Home.vue`，核心编辑器位于 `src/components/Editor/index.vue`，工具栏位于 `src/components/Toolbar.vue`。

## 内置组件

组件模板定义在 `src/custom-component/component-list.ts`，组件注册逻辑位于 `src/custom-component/index.ts`。

| 组件类型 | 显示名称 | 说明 |
| --- | --- | --- |
| `VText` | 文字 | 支持文字内容、颜色、字号、字重、对齐、行高、字间距等配置 |
| `VButton` | 按钮 | 支持按钮文案、文字颜色、背景色、字号、圆角、边框等配置 |
| `Picture` | 图片 | 支持图片 URL、水平翻转、垂直翻转 |
| `RectShape` | 矩形 | 支持背景、边框、圆角，并作为当前唯一可接收子组件的容器 |
| `CircleShape` | 圆形 | 支持填充色、边框色、边框宽度等配置 |
| `LineShape` | 直线 | 支持线条颜色、长度、粗细 |
| `SVGStar` | 星形 | SVG 图形组件 |
| `SVGTriangle` | 三角形 | SVG 图形组件 |
| `VTable` | 表格 | 支持复杂表格数据编辑，包含 `EditTable.vue` |
| `VChart` | 图表 | 基于 ECharts / vue-echarts 渲染图表 |
| `Group` | 组合 | 内部组件，不在组件面板展示，用于组合/拆分能力 |

## 技术栈

| 技术 | 用途 |
| --- | --- |
| Vue 3 + Composition API | 前端应用与编辑器组件开发 |
| TypeScript | 类型约束与组件数据结构定义 |
| Vite | 开发服务器、构建和代码分包 |
| Pinia | 画布数据、当前选中组件、主题、版本等状态管理 |
| Element Plus | 工具栏、表单、弹窗、Tabs 等 UI 组件 |
| Vue Router | `/` 编辑器页面与 `/preview` 独立预览页面 |
| Zod | JSON 导入、组件数据、画布样式和版本数据校验 |
| ECharts / vue-echarts | 图表组件渲染 |
| Ace Editor | JSON 数据编辑器 |
| html-to-image | 截图导出能力 |
| DOMPurify | HTML 导出与富文本内容安全净化 |
| Express | AI 服务端、鉴权、限流、CORS、健康检查 |
| Vitest / Playwright | 单元测试与端到端测试 |

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 7

### 安装依赖

```bash
git clone https://github.com/your-username/visual-drag-demo.git
cd visual-drag-demo
npm install
npm run server:install
```

也可以直接执行：

```bash
npm --prefix server install
```

### 配置环境变量

```bash
cp .env.example .env.local
cp server/.env.example server/.env
```

开发环境默认配置：

- 前端：`http://localhost:8080`
- 后端：`http://localhost:3000`
- Vite 代理：`/api` -> `VITE_DEV_API_PROXY_TARGET`，默认 `http://localhost:3000`

如需使用 AI 页面生成，请在 `server/.env` 中至少配置 `AI_API_KEY`。

### 启动项目

启动前端编辑器：

```bash
npm run dev
```

启动后端 AI 服务：

```bash
npm run api
```

启动后访问 `http://localhost:8080`。

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 Vite 开发服务器，默认端口 8080 |
| `npm run api` | 进入 `server` 并启动 Express 服务 |
| `npm run server:install` | 安装服务端依赖 |
| `npm run build` | 构建前端生产产物 |
| `npm run preview` | 预览前端生产构建产物 |
| `npm run type-check` | 执行 `vue-tsc --noEmit` 类型检查 |
| `npm run lint` | 执行 ESLint 并自动修复 |
| `npm run lint:check` | 只检查 ESLint 问题，不自动修复 |
| `npm run test` | 启动 Vitest 监听模式 |
| `npm run test:run` | 运行前端单元测试 |
| `npm run test:coverage` | 运行单元测试并输出覆盖率 |
| `npm run test:e2e` | 运行 Playwright 端到端测试 |
| `npm --prefix server test` | 运行服务端 Node.js 测试 |

## 环境变量

### 前端 `.env.local`

| 变量 | 说明 |
| --- | --- |
| `VITE_API_BASE_URL` | 生产环境 API 完整地址；开发环境留空时使用 Vite 代理 |
| `VITE_DEV_API_PROXY_TARGET` | 开发环境代理目标，默认 `http://localhost:3000` |
| `VITE_API_ACCESS_KEY` | 可选 API 访问密钥，仅适合受控内网部署 |

### 后端 `server/.env`

| 变量 | 说明 |
| --- | --- |
| `PORT` | Express 服务端口，默认 3000 |
| `CORS_ORIGIN` | 允许访问后端的前端域名，多个域名用逗号分隔 |
| `JSON_BODY_LIMIT` | 请求体大小限制，默认 `2mb` |
| `TRUST_PROXY` | 生产代理场景下是否信任反向代理 |
| `REQUIRE_API_AUTH` | 是否启用 API Key 鉴权 |
| `API_ACCESS_KEYS` | API Key 列表，配合 `REQUIRE_API_AUTH=true` 使用 |
| `RATE_LIMIT_*` | 通用接口限流配置 |
| `AI_RATE_LIMIT_*` | AI 接口限流配置 |
| `REDIS_URL` | 可选 Redis 地址，用于跨实例保存 Agent Session |
| `SESSION_TTL_MS` | Agent Session 过期时间 |
| `AI_API_KEY` | 主 LLM 服务密钥，AI 页面生成必填 |
| `AI_BASE_URL` | 主 LLM 服务地址，默认 StepFun 兼容接口 |
| `AI_MODEL` | 主模型名，默认 `step-3.7-flash` |
| `AI_FALLBACK_*` | 备用 LLM 服务配置，兼容 OpenAI Chat Completions 格式 |
| `AGENT_MAX_*` | Agent 执行步数、时长、修复轮次、上下文大小等预算配置 |

## 后端 API

服务端入口为 `server/app.js`，路由集中在 `server/routes`。

| 接口 | 说明 |
| --- | --- |
| `GET /api/health` | 健康检查 |
| `POST /api/ai/chat` | 旧版 AI 生成接口，返回页面生成/编辑动作 |
| `POST /api/ai/agent/round` | AI Agent 多轮接口，支持普通 JSON 返回与 `stream=true` SSE 流式返回 |

服务端默认启用 Helmet、CORS、通用限流、AI 限流，并可通过 `REQUIRE_API_AUTH` + `API_ACCESS_KEYS` 启用接口鉴权。

## 数据与状态设计

核心类型定义位于 `src/types/index.ts`，运行时校验位于 `src/schemas/index.ts`。

```ts
interface ComponentData {
  id: string
  component: string
  label: string
  icon: string
  propValue: unknown
  style: ComponentStyle
  parentId: string | null
  slot: string
  zIndex: number
  request?: RequestConfig
  animations: Animation[]
  events: Record<string, string>
  groupStyle: Record<string, unknown>
  isLock: boolean
  collapseName: string
  linkage: LinkageConfig
}
```

当前画布数据由 Pinia Store 管理，`src/storage/projectStorage.ts` 负责保存版本化 `ProjectDocument`：

- 优先保存到 IndexedDB。
- IndexedDB 不可用时降级到 localStorage。
- 首次启动时会尝试迁移旧版 `canvasData` / `canvasStyle`。
- 版本历史快照仍由 `useVersionManager.ts` 维护在本地存储中。

## 项目结构

```text
src/
├── api/                    # 前端请求封装与 AI Agent API
├── commands/               # 命令模式：撤销、重做、移动、缩放、组合、导入等
├── components/             # 编辑器 UI、工具栏、属性面板、AI 面板
│   ├── Editor/             # 画布、组件外框、网格、辅助线、预览渲染
│   └── agent/              # AI Agent 前端展示与测试相关模块
├── composables/            # 自动保存、拖拽、命令操作、面板开关等组合式逻辑
├── custom-component/       # 低代码组件实现、组件注册表、属性面板渲染器
├── router/                 # `/` 与 `/preview` 路由
├── schemas/                # Zod 数据校验 Schema
├── storage/                # IndexedDB / localStorage 项目文档存储
├── store/                  # Pinia 主状态仓库
├── styles/                 # 全局样式、暗黑模式、动画样式
├── types/                  # 前端类型定义
├── utils/                  # 事件、导出、校验、图层、动画、样式等工具函数
└── views/                  # Home 编辑器页面与 PreviewPage 独立预览页

server/
├── app.js                  # Express 应用入口
├── env.js                  # 环境变量读取工具
├── security.js             # CORS、限流、API Key 鉴权
├── llmProvider.js          # 主/备用 LLM Provider 池
├── sessionStore.js         # Agent Session 存储，支持 Redis
├── routes/                 # `/api/ai/chat` 与 `/api/ai/agent/round`
├── agent/                  # Agent Prompt、工具调用、输出解析、SSE、执行循环
├── utils/                  # 请求校验与 ID 工具
└── __tests__/              # 服务端测试

e2e/                        # Playwright 端到端测试
```

## 测试说明

- 前端单元测试使用 Vitest，测试文件位于 `src/**/__tests__/*.test.ts`。
- 服务端测试使用 Node.js 内置测试运行器，入口为 `server/__tests__/app.test.js`。
- E2E 测试使用 Playwright，测试文件位于 `e2e/`，配置会自动启动 `npm run dev -- --host 127.0.0.1`。

```bash
npm run test:run
npm --prefix server test
npm run test:e2e
```

## 扩展组件

新增组件时建议按当前注册机制扩展：

1. 在 `src/custom-component/` 下创建组件目录，至少包含 `Component.vue` 与 `Attr.vue`。
2. 在 `src/custom-component/component-list.ts` 中添加组件模板，包括 `component`、`label`、`icon`、`propValue`、`style` 等字段。
3. 如果属性配置较简单，在 `componentPropConfigs` 中声明控件配置，让 `PropPanelRenderer.vue` 自动生成属性表单。
4. 如果属性配置较复杂，保留独立 `Attr.vue`，例如 `VTable`、`VChart`。
5. 如需允许子组件放入容器，在注册元数据中设置 `acceptChildren: true`，当前项目默认只有 `RectShape` 开启。
6. 内部组件可设置 `internal: true`，例如 `Group` 不会展示在组件面板中。

## 生产部署

- 前端执行 `npm run build` 后部署 `dist/` 到静态托管平台。
- 后端 `server/` 需要作为独立 Node.js 服务部署，并在前端构建环境设置 `VITE_API_BASE_URL`。
- 生产环境建议开启 `REQUIRE_API_AUTH=true`，配置 `API_ACCESS_KEYS`，严格设置 `CORS_ORIGIN`。
- 多实例部署 AI Agent 时建议配置 `REDIS_URL`，避免 Session 只保存在单进程内存中。
- `VITE_API_ACCESS_KEY` 会进入浏览器产物，不能替代正式登录态或后端权限体系。

## 相关文档

- [TypeScript 迁移方案](./docs/TYPESCRIPT_MIGRATION.md)

## License

MIT
