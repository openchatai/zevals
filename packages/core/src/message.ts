export type ToolCall = {
  id?: string;
  name: string;
  args: Record<string, unknown>;
  result?: Record<string, any>;
};
export type AIMessage = {
  role: 'assistant';
  content: string;
  tool_calls?: Array<ToolCall>;
  context?: AgentResponseGenerationContext;
};
export type UserMessage = { role: 'user'; content: string };
export type ToolResultMessage = {
  role: 'tool';
  tool_call_id?: string;
  name: string;
  content: Record<string, unknown>;
};
export type SystemMessage = { role: 'system'; content: string };

export type Message = AIMessage | UserMessage | ToolResultMessage | SystemMessage;

/** The context that was used by the agent to generate a response. */
export type AgentResponseGenerationContext = {
  /**
   * Messages that were used as prompts to produce the response.
   * If not specified, the chat history prior to the response will be used for evaluation.
   */
  prompt_used?: Message[];
  /** The tool calls that were made by the LLM. */
  tool_calls?: Array<ToolCall & { result?: Record<string, any> }>;
};
