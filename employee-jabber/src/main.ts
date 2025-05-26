import { Hono } from "npm:hono";
import { basicAuth } from "npm:hono/basic-auth";
import OpenAI from "npm:openai";
import { zValidator } from "npm:@hono/zod-validator";
import { Client, CredentialManager, ok } from "npm:@atcute/client";
import type {} from "npm:@atcute/atproto";

import {
  actionIntervalInMs,
  deepseekApiKey,
  enableDebugStats,
  postmarkWebhookPassword,
  postmarkWebhookUsername,
} from "./env.ts";

import { employeeByEmail } from "./employees.ts";
import { EmployeeWithPrompt, InboundEmail } from "./models.ts";

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: deepseekApiKey,
});

type ATProtoData = { client: Client; did: string; pdsUri?: string };
const atProtoDataByEmail = new Map<string, ATProtoData>();

type QueueItem = { name: string; prompt: string; atProtoData: ATProtoData };
const actionQueue: QueueItem[] = [];

type Stats = { emailsReceived: number; postsMade: number; errors: number };
const runtimeStats: Stats & { employeeStats: Record<string, Stats> } = {
  emailsReceived: 0,
  postsMade: 0,
  errors: 0,
  employeeStats: {},
};

function incrementOverallStat(key: keyof Stats) {
  runtimeStats[key] += 1;
}

function incrementEmployeeStat(
  name: string,
  key: keyof Stats,
  mode: "increment-overall" | "skip-overall" = "increment-overall",
) {
  const stats = runtimeStats.employeeStats[name] ?? {
    emailsReceived: 0,
    postsMade: 0,
  };

  stats[key] += 1;
  runtimeStats.employeeStats[name] = stats;
  if (mode === "skip-overall") {
    return;
  }

  incrementOverallStat(key);
}

const app = new Hono();

if (enableDebugStats) {
  app.get("/", (c) =>
    c.json({
      "//":
        "These are the stats from this instance, they do not persist between restarts. This is just for debugging purposes.",
      ...runtimeStats,
    }));
}

app.post(
  "/",
  basicAuth({
    username: postmarkWebhookUsername,
    password: postmarkWebhookPassword,
  }),
  zValidator("json", InboundEmail),
  async (c) => {
    const {
      From: senderEmailAddress,
      OriginalRecipient: recipientEmailAddress,
      Subject: emailSubject,
      TextBody: emailTextBody,
      HtmlBody: emailHtmlBody,
    } = c.req.valid("json");

    const emailBody = emailHtmlBody ?? emailTextBody;
    if (!emailBody) {
      console.warn(
        `Email from ${senderEmailAddress} was sent with an empty body`,
      );
      incrementOverallStat("errors");
      return c.json({}, 200);
    }

    incrementOverallStat("emailsReceived");
    const employee: EmployeeWithPrompt | undefined = employeeByEmail.get(
      recipientEmailAddress,
    );
    if (!employee) {
      console.warn(
        `Could not find employee by email: ${recipientEmailAddress}`,
      );
      incrementOverallStat("errors");
      return c.json({}, 200);
    }

    const {
      name,
      bskyIdentifier,
      bskyPassword,
      prompt,
    } = employee;

    // We can skip incrementing the overall stats for emailReceived since we had counted it just before
    incrementEmployeeStat(name, "emailsReceived", "skip-overall");
    if (!atProtoDataByEmail.has(recipientEmailAddress)) {
      console.info(`Creating a new ATProto client session for: ${name}`);
      const manager = new CredentialManager({ service: "https://bsky.social" });
      const client = new Client({ handler: manager });
      await manager.login({
        identifier: bskyIdentifier,
        password: bskyPassword,
      });

      if (!manager.session) {
        console.warn(`No ATProto client session was created for: ${name}`);
        incrementOverallStat("errors");
        return c.json({}, 200);
      }

      atProtoDataByEmail.set(recipientEmailAddress, {
        client,
        did: manager.session.did,
        pdsUri: manager.session.pdsUri,
      });
    }

    const atProtoData = atProtoDataByEmail.get(recipientEmailAddress)!;
    actionQueue.push({
      name,
      atProtoData,
      prompt:
        `${prompt}\nFrom: ${senderEmailAddress}\nSubject: ${emailSubject}\nBody:\n\n${emailBody}`,
    });

    return c.json({}, 201);
  },
);

setInterval(async () => {
  const actionItem = actionQueue.shift();
  if (!actionItem) {
    console.log("No action items");
    return;
  }

  const {
    name,
    atProtoData,
    prompt,
  } = actionItem;
  const completion = await openai.chat.completions.create({
    model: "deepseek-chat",
    temperature: 0.5,
    messages: [{
      role: "system",
      content: prompt,
    }],
  });

  const chatResponse = completion.choices[0].message.content;
  if (!chatResponse) {
    console.warn(`Unable to get a response from Deepseek for: ${name}`);
    incrementEmployeeStat(name, "errors");
    return;
  }

  let postContents: string;
  try {
    const { response } = JSON.parse(chatResponse);
    postContents = response;
  } catch (e) {
    console.error(`Unable to parse the response from Deepseek for: ${name}`, e);
    incrementEmployeeStat(name, "errors");
    return;
  }

  const {
    client,
    did,
  } = atProtoData;

  const data = await ok(
    client.post("com.atproto.repo.createRecord", {
      input: {
        collection: "app.bsky.feed.post",
        repo: did as unknown as any,
        record: {
          "$type": "app.bsky.feed.post",
          text: postContents,
          langs: ["en"],
          createdAt: new Date().toISOString(),
        },
      },
    }),
  );

  if (data.validationStatus == "valid") {
    incrementEmployeeStat(name, "errors");
    return;
  }

  incrementEmployeeStat(name, "postsMade");
}, actionIntervalInMs);

export default app;
