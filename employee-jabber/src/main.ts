import { Hono } from "npm:hono";
import { basicAuth } from "npm:hono/basic-auth";
import OpenAI from "npm:openai";
import { zValidator } from "npm:@hono/zod-validator";
import { Client, CredentialManager, ok } from "npm:@atcute/client";
import type {} from "npm:@atcute/atproto";

import {
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

const bskyClientByEmail = new Map<string, Client>();

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
  zValidator("form", InboundEmail),
  async (c) => {
    const {
      From: senderEmailAddress,
      OriginalRecipient: recipientEmailAddress,
      TextBody: emailBody,
    } = c.req.valid("form");

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
    if (!bskyClientByEmail.has(recipientEmailAddress)) {
      console.info(`Creating a new ATProto client session for: ${name}`);
      const manager = new CredentialManager({ service: "https://bsky.social" });
      const client = new Client({ handler: manager });
      await manager.login({
        identifier: bskyIdentifier,
        password: bskyPassword,
      });
      bskyClientByEmail.set(recipientEmailAddress, client);
    }

    const client = bskyClientByEmail.get(recipientEmailAddress)!;
    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [{
        role: "system",
        content: `${prompt}\n${emailBody}`,
      }],
    });

    const chatResponse = completion.choices[0].message.content;
    if (!chatResponse) {
      console.warn(`Unable to get a response from Deepseek for: ${name}`);
      incrementEmployeeStat(name, "errors");
      return c.json({}, 200);
    }

    const data = await ok(
      client.post("com.atproto.repo.createRecord", {
        input: {
          collection: "app.bsky.",
          repo: "app.bsky.feed.post",
          record: {
            "$type": "app.bsky.feed.post",
            text: chatResponse,
            langs: ["en"],
            createdAt: new Date().toISOString(),
          },
        },
      }),
    );

    if (data.validationStatus == "valid") {
      incrementEmployeeStat(name, "errors");
      return c.json({}, 200);
    }

    incrementEmployeeStat(name, "postsMade");
    return c.json({}, 201);
  },
);

export default app;
