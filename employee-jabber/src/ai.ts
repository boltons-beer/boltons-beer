import OpenAI from "openai";

import { ChatMessage } from "./persistence.ts";
import { randomIntFromInterval } from "./utils.ts";
import * as Env from "./env.ts";
import * as Db from "./persistence.ts";
import { AiNextAction, AiNextActionList, Employee } from "./models.ts";
import { Err, Ok, Result } from "./result.ts";

const openai = new OpenAI({
  baseURL: Env.ai.providerUrl,
  apiKey: Env.ai.providerApiKey,
});

type ConversationArgs = {
  queueItemId: string;
  employee: Employee;
  systemPrompt: string;
  userPrompt: string;
};

// Maximum Bsky post length + json format
const EXPECTED_POST_LENGTH: number = 342;

// The number of tokens budgeted for everything before the response
const MAX_PREAMBLE_TOKENS: number = Env.ai.maxConversationTokens -
  EXPECTED_POST_LENGTH;

// Estimate the number of tokens for the conversation
// Generally:
//
// 1 English character ≈ 0.3 token.
// 1 Chinese character ≈ 0.6 token.
//
// See: https://api-docs.deepseek.com/quick_start/token_usage
// Other providers may calculate it differently, but this generally
// holds up well across provides
export function estimateTokens(message: ChatMessage): number {
  // When estimating, use the larger number just to be safe
  return message.content.length * 0.6;
}

export function truncateConversationIfTooLong(
  conversation: ChatMessage[],
): Result<ChatMessage[]> {
  const systemMessage = conversation[0];
  if (systemMessage?.role !== "system") {
    return Err.wrap(
      new Error("First message in a conversation must be a system message"),
    );
  }

  const userMessage = conversation[conversation.length - 1];
  if (userMessage?.role !== "user") {
    return Err.wrap(
      new Error("Most recent message in a conversation must be a user message"),
    );
  }

  const systemMessageTokenLength = estimateTokens(systemMessage);
  const userMessageTokenLength = estimateTokens(userMessage);

  const truncatedConversation = [userMessage];
  let remainingTokenBudget = MAX_PREAMBLE_TOKENS - systemMessageTokenLength -
    userMessageTokenLength;

  for (
    const message of conversation.toReversed().slice(1, conversation.length - 1)
  ) {
    const tokenLength = estimateTokens(message);
    if (tokenLength > remainingTokenBudget) {
      continue;
    }

    remainingTokenBudget -= tokenLength;
    truncatedConversation.push(message);
  }

  return Ok.wrap([...truncatedConversation, systemMessage].toReversed());
}

export async function converse(
  { queueItemId, employee, systemPrompt, userPrompt }: ConversationArgs,
): Promise<Result<AiNextAction[]>> {
  const { name, email } = employee;
  const conversationHistoryResult = truncateConversationIfTooLong([
    ...Db.query("conversations", email, [{
      chatMessageId: queueItemId,
      role: "system",
      content: systemPrompt,
    }]),
    {
      chatMessageId: queueItemId,
      role: "user",
      content: userPrompt,
    },
  ]);

  if (conversationHistoryResult.kind === "err") {
    return conversationHistoryResult;
  }

  const conversationHistory = conversationHistoryResult.value;

  let completion: OpenAI.Chat.ChatCompletion;
  try {
    completion = await openai.chat.completions.create({
      model: Env.ai.modelName,
      temperature: randomIntFromInterval(
        Env.ai.minTemperature,
        Env.ai.maxTemperature,
      ),
      messages: conversationHistory,
    });
  } catch (e) {
    return Err.wrap(
      new Error(
        `[${queueItemId}] Failed to get a response from Deepseek for: ${name}`,
        { cause: e },
      ),
    );
  }

  const chatResponse = completion?.choices?.[0]?.message?.content;
  if (!chatResponse) {
    return Err.wrap(
      new Error(
        `[${queueItemId}] Unable to get a response from Deepseek for: ${name}`,
      ),
    );
  }

  Db.upsert("conversations", email, [
    ...conversationHistory,
    {
      chatMessageId: queueItemId,
      role: "assistant",
      content: chatResponse,
    },
  ]);

  try {
    return Ok.wrap(AiNextActionList.parse(JSON.parse(chatResponse)));
  } catch (e) {
    return Err.wrap(
      new Error(
        `[${queueItemId}] Unable to parse the response from Deepseek for: ${name}`,
        { cause: e },
      ),
    );
  }
}
