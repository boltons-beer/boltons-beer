import { Hono } from "npm:hono@4.7.10";
import { basicAuth } from "npm:hono/basic-auth";
import { zValidator } from "npm:@hono/zod-validator";

import {
  enabledDebugATProto,
  enabledDebugConversations,
  enableDebugStats,
  postmarkWebhookPassword,
  postmarkWebhookUsername,
} from "./env.ts";
import { InboundEmail } from "./models.ts";
import type { ATProtoData, ChatMessage } from "./persistence.ts";
import * as Stats from "./stats.ts";
import * as Db from "./persistence.ts";
import * as Queue from "./queue.ts";
import * as Bsky from "./bsky.ts";
import { undefined } from "zod/v4";

const app = new Hono();

if (enableDebugStats) {
  app.get("/debug/stats", (c) =>
    c.json({
      "//":
        "These are the stats from this instance, they do not persist between restarts. This is just for debugging purposes.",
      ...Stats.get(),
    }));
}

if (enabledDebugConversations) {
  app.get("/debug/convos", (c) => {
    const conversationsByName: Record<string, ChatMessage[]> = {};
    for (const [email, conversation] of Db.rows("conversations")) {
      const { name } = Db.query("employees", email)!;
      conversationsByName[name] = conversation;
    }

    return c.json({
      "//":
        "These are the conversations from this instance, they do not persist between restarts. This is just for debugging purposes.",
      ...conversationsByName,
    });
  });
}

if (enabledDebugATProto) {
  app.get("/debug/atproto", (c) => {
    const atProtoDataByName: Record<
      string,
      Pick<ATProtoData, "did" | "pdsUri">
    > = {};
    for (const [email, atProtoData] of Db.rows("atProtoData")) {
      const { name } = Db.query("employees", email)!;
      const { did, pdsUri } = atProtoData;
      atProtoDataByName[name] = {
        did,
        pdsUri,
      };
    }

    return c.json({
      "//":
        "This is the various in-use ATProto data from this instance, they do not persist between restarts. This is just for debugging purposes.",
      ...atProtoDataByName,
    });
  });
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
      Bcc: bcc,
      Cc: cc,
    } = c.req.valid("json");

    const emailBody = emailHtmlBody?.trim() ? emailHtmlBody : emailTextBody;
    if (!emailBody) {
      console.warn(
        `Email from ${senderEmailAddress} was sent with an empty body`,
      );
      Stats.incrementOverall("errors");
      return c.json({}, 200);
    }

    Stats.incrementOverall("emailsReceived");

    const emailAddresses = new Set([
      recipientEmailAddress,
      ...bcc?.split(",") ?? [],
      ...cc?.split(",") ?? [],
    ].filter((emailAddress) => emailAddress.trim() != ""));
    for (const emailAddress of emailAddresses) {
      const employee = Db.query("employees", emailAddress);
      if (!employee) {
        console.warn(
          `Could not find employee by email: ${emailAddress}`,
        );
        Stats.incrementOverall("errors");
        continue;
      }

      // We can skip incrementing the overall stats for emailReceived since we had counted it just before
      Stats.incrementForEmployee(
        employee.name,
        "emailsReceived",
        "skip-overall",
      );
      const loginResult = await Bsky.login(employee);
      if (loginResult.kind === "err") {
        Stats.incrementForEmployee(employee.name, "errors");
        console.error(loginResult.value);
        continue;
      }

      const ccLine = `${cc ? `CC: ${cc}\n` : ""}`;
      const bccLine = `${bcc ? `BCC: ${bcc}\n` : ""}`;
      const emailPromptId = await Queue.storeAsBlob(
        `To: ${recipientEmailAddress}\nFrom: ${senderEmailAddress}\n${ccLine}${bccLine}Subject: ${emailSubject}\nBody:\n\n${emailBody}`,
      );

      const systemPromptId = await Queue.storeAsBlob(
        employee.prompt,
      );

      const {
        prompt: _,
        ...plainEmployee
      } = employee;
      await Queue.enqueue({
        systemPromptId,
        emailPromptId,
        employee: plainEmployee,
      });
    }

    return c.json({}, 201);
  },
);

export default app;
