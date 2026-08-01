/**
 * Agent Eval CLI
 *
 * 用法：
 *   node scripts/eval-agent.js                    # mock 模式（默认，无 API 成本）
 *   node scripts/eval-agent.js --mode live        # 真实 LLM（需要 server/.env 配置 AI_API_KEY）
 *   node scripts/eval-agent.js --task poster_dance_recruit
 *   node scripts/eval-agent.js --mode live --compare   # 主/备模型分别跑并对比
 *   node scripts/eval-agent.js --mode live --out reports/my-run.json
 *
 * 输出：控制台摘要 + JSON 报告（含通过率/得分/token/耗时/轨迹）
 */

import { mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { runEvalSuite } from '../server/eval/runner.js'
import { getEvalTasks } from '../server/eval/tasks.js'
import { getConfiguredAIProviders } from '../server/llmProvider.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEFAULT_OUT_DIR = join(__dirname, '..', 'server', 'eval', 'reports')

function parseArgs(argv) {
    const args = { mode: 'mock', compare: false, out: null, taskIds: [] }
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i]
        if (arg === '--mode') {
            args.mode = argv[++i] === 'live' ? 'live' : 'mock'
        } else if (arg === '--compare') {
            args.compare = true
        } else if (arg === '--out') {
            args.out = argv[++i]
        } else if (arg === '--task') {
            args.taskIds.push(argv[++i])
        } else if (arg === '--help' || arg === '-h') {
            args.help = true
        }
    }
    return args
}

function formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
}

function printSummary(report) {
    console.log('\n================ Agent Eval 报告 ================')
    console.log(`模式: ${report.mode} | Provider: ${report.provider}`)
    console.log(`任务: ${report.passed}/${report.total} 通过 (${(report.passRate * 100).toFixed(1)}%) | 平均得分: ${report.avgScore}/100`)
    console.log(`总耗时: ${formatDuration(report.totalDurationMs)} | 总 token: ${report.totalTokens}`)
    console.log('------------------------------------------------')

    for (const result of report.results) {
        const mark = result.pass ? '✅' : '❌'
        const tokenText = result.tokenUsage?.totalTokens
            ? `${result.tokenUsage.totalTokens}t`
            : '-'
        console.log(
            `${mark} [${result.score}/100] ${result.taskId} "${result.taskName}" `
            + `(${formatDuration(result.durationMs)}, ${tokenText})`,
        )
        if (result.error) {
            console.log(`   异常: ${result.error}`)
        }
        for (const failure of result.failures) {
            console.log(`   ✗ ${failure.code}: ${failure.message}`)
        }
    }

    if (report.results.length > 0) {
        const stepCounts = report.results.map(result => result.steps?.length || 0)
        const avgSteps = stepCounts.reduce((sum, n) => sum + n, 0) / stepCounts.length
        console.log('------------------------------------------------')
        console.log(`平均步骤数: ${avgSteps.toFixed(1)}（轨迹记录在报告 results[].steps）`)
    }
    console.log('==================================================\n')
}

async function main() {
    const args = parseArgs(process.argv.slice(2))

    if (args.help) {
        console.log([
            'Agent Eval CLI',
            '',
            '用法:',
            '  node scripts/eval-agent.js [options]',
            '',
            '选项:',
            '  --mode <mock|live>        运行模式（默认 mock）',
            '  --task <id>               只跑指定任务（可重复）',
            '  --compare                 主/备模型分别运行并对比（live 模式）',
            '  --out <path>              报告输出路径（默认 server/eval/reports/）',
            '  --help                    显示帮助',
            '',
            '任务列表:',
            ...getEvalTasks().map(task => `  - ${task.id}: ${task.name}`),
        ].join('\n'))
        return
    }

    // live 模式的多 Provider 对比：主/备各跑一遍
    const reports = []
    if (args.mode === 'live' && args.compare) {
        const providers = getConfiguredAIProviders()
        if (providers.length < 2) {
            console.error('--compare 需要配置主 + 备用两个 Provider（AI_API_KEY 与 AI_FALLBACK_API_KEY）')
            process.exitCode = 1
            return
        }
        for (const provider of providers) {
            console.log(`\n>>> 运行 ${provider.name} (${provider.model})`)
            const report = await runEvalSuite({
                mode: 'live',
                taskIds: args.taskIds,
                providers: [provider],
            })
            reports.push(report)
            printSummary(report)
        }

        // 对比汇总
        console.log('\n============ Provider 对比 ============')
        for (const report of reports) {
            console.log(
                `${report.provider}: ${report.passed}/${report.total} 通过, `
                + `得分 ${report.avgScore}, token ${report.totalTokens}, 耗时 ${formatDuration(report.totalDurationMs)}`,
            )
        }
    } else {
        const report = await runEvalSuite({
            mode: args.mode,
            taskIds: args.taskIds,
        })
        reports.push(report)
        printSummary(report)
    }

    // 报告落盘
    mkdirSync(DEFAULT_OUT_DIR, { recursive: true })
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    for (const [index, report] of reports.entries()) {
        const providerSuffix = reports.length > 1 ? `-${report.provider || index}` : ''
        const outPath = args.out
            ? (args.out.endsWith('.json') ? args.out : `${args.out}.json`)
            : join(DEFAULT_OUT_DIR, `eval-${report.mode}${providerSuffix}-${timestamp}.json`)
        writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8')
        console.log(`报告已写入: ${outPath}`)
    }
}

main().catch(error => {
    console.error('Eval 运行失败:', error)
    process.exitCode = 1
})
