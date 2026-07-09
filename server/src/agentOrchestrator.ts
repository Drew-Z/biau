import { runInternalAgentGraph } from './agentGraph.js'
import type { InternalAgentRunInput, InternalAgentRunResult } from './agentTypes.js'

export async function runInternalAgent(input: InternalAgentRunInput): Promise<InternalAgentRunResult> {
  return runInternalAgentGraph(input)
}
