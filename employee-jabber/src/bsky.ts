import { Client, CredentialManager, ok } from "npm:@atcute/client";
import type {} from "npm:@atcute/atproto";

import * as Db from "./persistence.ts";
import { Employee } from "./models.ts";
import {Err, Ok, Result} from "./result.ts";

export async function login(
  { name, email, bskyIdentifier, bskyPassword }: Employee,
): Promise<Result<void>> {
  if (Db.exists("atProtoData", email)) {
    return Ok.wrap(undefined);
  }

  console.info(`Creating a new ATProto client session for: ${name}`);
  const manager = new CredentialManager({ service: "https://bsky.social" });
  const client = new Client({ handler: manager });
  await manager.login({
    identifier: bskyIdentifier,
    password: bskyPassword,
  });

  if (!manager.session) {
    return Err.wrap(
      new Error(`No ATProto client session was created for: ${name}`),
    );
  }

  Db.upsert("atProtoData", email, {
    client,
    did: manager.session.did,
    pdsUri: manager.session.pdsUri,
  });

  return Ok.wrap(undefined);
}

export async function post(
  { name, email }: Employee,
  post: string,
): Promise<Result<void>> {
  const {
    client,
    did,
  } = Db.query("atProtoData", email)!;

  const data = await ok(
    client.post("com.atproto.repo.createRecord", {
      input: {
        collection: "app.bsky.feed.post",
        repo: did as unknown as any,
        record: {
          "$type": "app.bsky.feed.post",
          text: post,
          langs: ["en"],
          createdAt: new Date().toISOString(),
        },
      },
    }),
  );

  if (data.validationStatus === "valid") {
    return Ok.wrap(undefined);
  }

  return Err.wrap(new Error(`ATProto Record Creation was not valid for: ${name}`));
}
