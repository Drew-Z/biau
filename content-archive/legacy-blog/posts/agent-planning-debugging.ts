import type { BlogPost } from '../blogShared'

const post: BlogPost = {
  "slug": "agent-planning-debugging",
  "title": "Agent 规划失败排查：循环调用、错误工具与目标漂移",
  "tag": "AI 应用",
  "column": "knowledge",
  "detail": "Agent 失败通常不是模型突然变差，而是状态、工具、权限或目标约束出了问题。本文讨论 trace、状态机和人工接管的排查方法。",
  "date": "2026-06-20",
  "readTime": "10 min",
  "series": "AI 应用知识库",
  "knowledgePoints": [
    "Agent 排障",
    "任务规划",
    "工具调用"
  ],
  "scenarios": [
    "多步骤生成任务",
    "自动审查流程",
    "工具调用失败恢复"
  ],
  "practiceChecklist": [
    "为每次 Agent 运行记录 goal、plan、toolCall、observation 和 state",
    "限制最大步数、最大重试和可调用工具集合",
    "高风险或不确定状态进入人工接管"
  ],
  "sections": [
    {
      "title": "问题背景：Agent 失败要看完整过程",
      "body": "Agent 规划失败常见表现是循环调用同一个工具、选错工具、参数不完整、忘记原始目标、越过权限边界或在失败后继续硬跑。排查时不能只看最后一句输出，要看完整 trace。"
    },
    {
      "title": "Trace：记录每一步决策和工具结果",
      "body": "每次运行最好记录 goal、currentState、plan、toolName、toolArgs、toolResult、observation、nextState、errorType 和 tokenUsage。没有这些信息时，只能猜模型为什么这么做；有 trace 后，才能判断是 prompt、工具 schema、状态机还是业务数据的问题。"
    },
    {
      "title": "循环调用：用硬边界停止消耗",
      "body": "循环调用通常来自目标不清、工具结果无法满足判断条件、失败后缺少退出路径。系统应该设置 maxSteps、maxRetries、重复工具调用检测和状态超时。达到边界后不要继续消耗 token，而是返回可解释错误或进入人工处理。"
    },
    {
      "title": "工具选择：回看描述、schema 和前置条件",
      "body": "Agent 选错工具时，常见原因是工具描述太像、schema 太宽、参数名不清晰或缺少前置条件。工具应该按读写能力拆开，描述要说明何时使用、何时不能使用，参数要有 enum、required、范围校验和业务校验。"
    },
    {
      "title": "目标漂移：用状态机约束阶段动作",
      "body": "多轮任务中，模型可能从“生成宠物资源包”漂移到“解释资源包怎么做”，或从“审查合同风险”漂移到“一般法律建议”。状态机可以把任务拆成固定阶段，例如 planning、retrieving、generating、validating、waitingReview、completed，限制每个阶段允许的动作。"
    },
    {
      "title": "人工接管：不确定时主动停下来",
      "body": "当工具连续失败、目标冲突、权限不足、引用缺失或风险等级过高时，Agent 应该主动停止并请求人工确认。可控系统的目标不是让模型永远自动完成，而是在不确定时及时停下来。"
    }
  ],
  "takeaways": [
    "Agent 排障要看完整 trace，而不是只看最终回答。",
    "maxSteps、状态机、工具 schema 和人工接管是防止 Agent 失控的基础。",
    "工具描述、参数校验和权限边界会直接影响 Agent 规划质量。"
  ]
}

export default post
