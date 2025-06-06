import { openKvToolbox } from "@kitsonk/kv-toolbox";
import { toBlob } from "@kitsonk/kv-toolbox/blob";
import { RateLimiter } from "limiter";

import { randomIntFromInterval } from "./utils.ts";
import * as Env from "./env.ts";
import { Employee } from "./models.ts";
import * as Stats from "./stats.ts";
import * as Ai from "./ai.ts";
import * as Bsky from "./bsky.ts";
import * as Postmark from "./postmark.ts";

export type QueueItem = {
  queueItemId: string;
  employee: Employee;
  systemPromptId: string;
  emailPromptId: string;
};

const limiter = new RateLimiter({
  tokensPerInterval: Env.limits.rateLimitAmount,
  interval: Env.limits.rateLimitIntervalInMs,
});

const kv = await openKvToolbox({ path: ":memory:" });

export async function storeAsBlob(item: string): Promise<string> {
  const blobId = crypto.randomUUID();
  await kv.setBlob([blobId], toBlob(item));
  return blobId;
}

const decoder = new TextDecoder();
export async function takeBlob(blobId: string): Promise<string | null> {
  const { value: rawBlob } = await kv.getBlob([blobId]);
  if (!rawBlob) {
    return null;
  }

  const blobValue = decoder.decode(rawBlob);
  await kv.delete([blobId]);
  return blobValue;
}

export async function enqueue(
  item: Omit<QueueItem, "queueItemId">,
): Promise<string> {
  const queueItemId = crypto.randomUUID();
  await kv.enqueue({ ...item, queueItemId }, {
    // We don't want to retry messages, just let them fail
    backoffSchedule: [],
    delay: randomIntFromInterval(
      Env.limits.minActionDelayInMs,
      Env.limits.maxActionDelayInMs,
    ),
  });
  return queueItemId;
}

export async function startListener(): Promise<void> {
  await kv.listenQueue(async (actionItem: QueueItem) => {
    const {
      queueItemId,
      employee,
      systemPromptId,
      emailPromptId,
    } = actionItem;

    const { name } = employee;

    // Slow things down a bit
    const wasAllocatedTokens = limiter.tryRemoveTokens(1);
    if (!wasAllocatedTokens) {
      console.warn(
        `[${queueItemId}] Rate limited for: ${name}`,
      );
      return;
    }

    const systemPrompt = await takeBlob(systemPromptId);
    if (!systemPrompt) {
      console.warn(
        `[${queueItemId}] Unable to find system prompt by id for: ${name}`,
      );
      Stats.incrementForEmployee(name, "errors");
      return;
    }

    const emailPrompt = await takeBlob(emailPromptId);
    if (!emailPrompt) {
      console.warn(
        `[${queueItemId}] Unable to find email prompt by id for: ${name}`,
      );
      Stats.incrementForEmployee(name, "errors");
      return;
    }

    const nextActionsResult = await Ai.converse({
      employee,
      queueItemId,
      systemPrompt,
      userPrompt: emailPrompt,
    });

    if (nextActionsResult.kind === "err") {
      Stats.incrementForEmployee(name, "errors");
      console.error(nextActionsResult.value);
      return;
    }

    for (const nextAction of nextActionsResult.value) {
      let result;
      let statKey: "postsMade" | "emailsSent";
      switch (nextAction.kind) {
        case "bsky-post": {
          statKey = "postsMade";
          result = await Bsky.post(employee, nextAction.content);
          break;
        }
        case "bsky-thread": {
          statKey = "postsMade";
          result = await Bsky.postThread(employee, nextAction.content);
          break;
        }
        case "email-send": {
          statKey = "emailsSent";
          result = await Postmark.send({
            employee,
            ...nextAction,
          });
          break;
        }
      }

      if (result.kind === "err") {
        Stats.incrementForEmployee(name, "errors");
        console.error(result.value);
      } else {
        Stats.incrementForEmployee(name, statKey);
        console.info(`Successful action '${nextAction.kind}' for: ${name}`);
      }
    }
  });
}
