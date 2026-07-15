import { runOperatorAgentGraph } from './agentGraph.js'
import type { OperatorAgentRunInput, OperatorAgentRunResult } from './agentTypes.js'

export async function runOperatorAgent(input: OperatorAgentRunInput): Promise<OperatorAgentRunResult> {
  return runOperatorAgentGraph(input)
}
