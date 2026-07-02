/**
 * ESLint 配置（TypeScript + Vue 3）
 *
 * 设计目标：
 * - 用已安装的 @typescript-eslint/parser 解析 .ts/.vue
 * - 开启 eqeqeq / prefer-const / no-unused-vars 为 error，守住代码质量基线
 * - no-unused-vars / no-explicit-any 暂保持 warn，避免一次性引入海量改动
 *   待逐步清理后再收紧为 error
 */
module.exports = {
    root: true,
    env: {
        node: true,
        browser: true,
        es2022: true,
    },
    ignorePatterns: ['iconfont.js', 'iconfont/', 'dist/', 'node_modules/', 'scripts/', 'public/'],
    parser: 'vue-eslint-parser',
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.vue'],
    },
    plugins: ['@typescript-eslint'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:vue/vue3-recommended',
    ],
    rules: {
        // ===== 基础质量规则（error，必须修）=====
        eqeqeq: ['error', 'always'],
        'prefer-const': 'error',
        'no-var': 'error',
        'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
        'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',

        // ===== TS 规则 =====
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],

        // ===== Vue 规则 =====
        'vue/multi-word-component-names': 'off',
        // no-dupe-keys 针对 Options API 的 data() 设计；<script setup> + defineProps<Props>()
        // 下会对 Props 接口字段误报，关闭
        'vue/no-dupe-keys': 'off',
        // 组件直接修改 props.element 是本项目的既定约定（element 为 store 下发的画布数据引用，
        // 组件作为就地编辑入口），保留为 warn 而非强制重构，避免引入回归风险
        'vue/no-mutating-props': 'warn',
        // VText 组件用 v-html 渲染富文本，已有 DOMPurify 清洗；按需关闭
        'vue/no-v-html': 'off',
        'vue/html-indent': ['error', 4, { attribute: 1, baseIndent: 1, closeBracket: 0 }],
        'vue/max-attributes-per-line': ['error', { singleline: { max: 3 }, multiline: { max: 1 } }],

        // ===== 风格规则（保持与现有代码一致）=====
        quotes: ['error', 'single'],
        semi: ['error', 'never'],
        indent: ['error', 4, { SwitchCase: 1, ignoredNodes: ['TemplateLiteral'] }],
        'comma-dangle': ['error', 'always-multiline'],
        'object-curly-spacing': ['error', 'always'],
        'max-len': ['warn', 140],
        'linebreak-style': 'off',
    },
    overrides: [
        {
            // .vue 文件：由 vue-eslint-parser 接管，脚本块用 TS parser
            files: ['*.vue'],
            parser: 'vue-eslint-parser',
            parserOptions: {
                parser: '@typescript-eslint/parser',
                ecmaVersion: 2022,
                sourceType: 'module',
            },
        },
        {
            // 配置文件本身用 JS，不需要 TS parser
            files: ['*.js', '*.cjs', '*.mjs'],
            parser: null,
            parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
        },
    ],
}
