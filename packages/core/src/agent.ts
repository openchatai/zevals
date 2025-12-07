import { AIMessage, Message } from './message';

/** The result of invoking a {@link Agent} to generate an AI response to be evaluated. */
export type AgentInvocationResult = {
  /** The final response, i.e. the message returned to the user. */
  message: AIMessage;
};

/** An AI agent to evaluate. */
export interface Agent {
  invoke(params: { messages: Array<Message> }): Promise<AgentInvocationResult>;
}
