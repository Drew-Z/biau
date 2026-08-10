import { writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { interviewTopicGroups, type InterviewTopic } from './project-notes-question-bank-topics'

interface InterviewQuestion {
  question: string
  followUp: string
  answer: string
  failureScenario: string
  verification: string
}

const scriptDir = dirname(fileURLToPath(import.meta.url))
const scriptPath = fileURLToPath(import.meta.url)
const outputPath = resolve(scriptDir, '..', 'docs/project-notes/interview-question-bank.md')

function buildQuestions(topic: InterviewTopic): InterviewQuestion[] {
  return [
    {
      question: `请从状态所有权和数据流角度说明「${topic.title}」的工作机制。`,
      followUp: `如果改用「${topic.alternative}」，哪些关键不变量会被破坏？请说明当前机制在哪个边界停止，以及调用方如何知道结果仍然可信。`,
      answer: `${topic.mechanism}当前设计的核心理由是：${topic.decision}`,
      failureScenario: topic.failure,
      verification: topic.verification,
    },
    {
      question: `「${topic.title}」为什么选择当前设计，而不是「${topic.alternative}」？`,
      followUp: `请分别从一致性、延迟、隐私和维护成本比较两种方案，并给出什么生产信号出现时才值得重新评估当前选择。`,
      answer: `${topic.decision}当前机制是：${topic.mechanism}`,
      failureScenario: `如果当前假设不再成立，最先出现的风险是：${topic.failure}`,
      verification: `先用同一组业务夹具比较两种方案，再执行当前方案的门禁：${topic.verification}`,
    },
    {
      question: `当「${topic.title}」出现异常时，失效链路和恢复策略分别是什么？`,
      followUp: `请指出恢复从哪个持久边界开始、哪些副作用不能自动重放，以及怎样防止旧客户端、旧 worker 或旧配置覆盖新状态。`,
      answer: `主要失效链路是：${topic.failure}恢复时应当：${topic.recovery}`,
      failureScenario: `最危险的处理方式是忽略阶段差异并从头自动重试，因为它会放大这个问题：${topic.failure}`,
      verification: `在关键边界前后注入失败并执行恢复，然后检查状态、重复副作用和终态；具体门禁为：${topic.verification}`,
    },
    {
      question: `「${topic.title}」有哪些安全、隐私或公开表述边界？`,
      followUp: `如果为了排障或展示而增加字段，哪些内容仍必须留在服务端或私有仓库？如何区分必要的用户决策信息与只满足内部好奇的字段？`,
      answer: `${topic.boundary}这项边界必须和功能机制同时设计，而不能只依赖发布前手工脱敏。`,
      failureScenario: `边界被弱化后，不仅可能泄漏信息，还会让外部读者或调用方错误理解系统能力；具体失效是：${topic.failure}`,
      verification: `对输出字段、日志、截图和文档做 allowlist 与敏感模式检查，并结合领域门禁验证：${topic.verification}`,
    },
    {
      question: `如何为「${topic.title}」建立从确定性测试到生产观察的证据链？`,
      followUp: `请逐层说明单元或合同测试、集成测试、浏览器或端到端测试、生产观察各自能证明什么，哪些结论不能从上一层直接外推。`,
      answer: `${topic.verification}证据结论还必须受以下边界限制：${topic.boundary}`,
      failureScenario: `如果只看测试数量、HTTP 200 或历史一次成功，就会漏掉这个风险：${topic.failure}`,
      verification: `保存精确版本、输入范围、预期终态和实际结果，并引用登记证据 ${topic.evidence.join('、')}；生产观察必须带日期且不得写成持续健康保证。`,
    },
  ]
}

export function renderQuestionBank(): string {
  const lines = [
    '# 项目工程面试题库',
    '',
    '本题库采用“主题 × 五个角度”的结构：每个主题分别讨论工作机制、设计权衡、故障恢复、安全边界和验证证据。回答以仓库证据为上限，不把测试库存、设计意图或历史生产观察写成当前持续能力。',
    '',
    '每题都包含深入追问、具体失败场景和可执行验证方式，适合用于一面基础追问、二面系统设计和项目复盘。Evidence ID 统一解析到 [证据登记册](./evidence-register.md)。',
    '',
  ]

  for (const group of interviewTopicGroups) {
    const questions = group.topics.flatMap((item) => buildQuestions(item).map((question) => ({ item, question })))
    if (questions.length !== group.expectedCount) {
      throw new Error(`${group.scope} expected ${group.expectedCount} questions, got ${questions.length}`)
    }

    lines.push(`## ${group.heading}`, '')
    questions.forEach(({ item, question }, index) => {
      const id = `QA-${group.prefix}-${String(index + 1).padStart(3, '0')}`
      lines.push(
        `### ${id}`,
        `- 范围: ${group.scope}`,
        `- 问题: ${question.question}`,
        `- 深入追问: ${question.followUp}`,
        `- 参考回答: ${question.answer}`,
        `- 失败场景: ${question.failureScenario}`,
        `- 验证方式: ${question.verification}`,
        `- 证据: ${item.evidence.join(', ')}`,
        '',
      )
    })
  }

  const total = interviewTopicGroups.reduce((sum, group) => sum + group.expectedCount, 0)
  if (total !== 300) throw new Error(`Expected exactly 300 questions, got ${total}`)
  return `${lines.join('\n').trim()}\n`
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  await writeFile(outputPath, renderQuestionBank(), 'utf8')
  console.log(`Generated ${outputPath} with 300 detailed Chinese Q&A groups.`)
}
