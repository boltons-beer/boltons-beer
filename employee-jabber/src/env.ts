import { decodeBase64 } from "@std/encoding/base64";

export const debug = implementAnonymizedSerialization({
  env: booleanEnvVar("ENABLE_DEBUG_ENV"),
  prompt: booleanEnvVar("ENABLE_DEBUG_PROMPT"),
  stats: booleanEnvVar("ENABLE_DEBUG_STATS"),
  conversations: booleanEnvVar(
    "ENABLE_DEBUG_CONVERSATIONS",
  ),
  atProto: booleanEnvVar("ENABLE_DEBUG_ATPROTO"),
});

export const limits = implementAnonymizedSerialization({
  minActionDelayInMs: numberEnvVar("MIN_ACTION_DELAY_MS") ?? 1000,
  maxActionDelayInMs: numberEnvVar("MAX_ACTION_DELAY_MS") ??
    1000 * 60 * 5,
  rateLimitAmount: numberEnvVar("RATE_LIMIT_AMOUNT") ?? 5,
  rateLimitIntervalInMs: numberEnvVar("RATE_LIMIT_INTERVAL_MS") ??
    1000 * 60 * 10,
});

export const postmark = implementAnonymizedSerialization({
  webhookUsername: requiredStringEnvVar(
    "POSTMARK_WEBHOOK_USERNAME",
  ),
  webhookPassword: requiredStringEnvVar(
    "POSTMARK_WEBHOOK_PASSWORD",
  ),
  apiKey: requiredStringEnvVar(
    "POSTMARK_API_KEY",
  ),
}, ["webhookUsername", "webhookPassword", "apiKey"]);

export const ai = implementAnonymizedSerialization({
  providerApiKey: requiredStringEnvVar("AI_MODEL_PROVIDER_API_KEY"),
  providerUrl: Deno.env.get("AI_MODEL_PROVIDER_URL") ??
    "https://api.deepseek.com",
  maxConversationTokens: numberEnvVar("MAX_CONVERSATION_TOKENS") ?? 67336,
  modelName: Deno.env.get("AI_MODEL_NAME") ?? "deepseek-reasoner",
  minTemperature: numberEnvVar("MIN_TEMPERATURE") ?? 0.01,
  maxTemperature: numberEnvVar("MAX_TEMPERATURE") ?? 0.6,
}, ["providerApiKey"]);

export const context = implementAnonymizedSerialization({
  employees:
    decodeB64EnvVarAs<unknown[]>("B64_ENCODED_EMPLOYEES", JSON.parse) ?? [],
  storyline: decodeB64EnvVarAsString("B64_ENCODED_STORYLINE") ??
    "Not remarkable",
}, ["employees", "storyline"]);

export const anonymized = Object.entries(
  {
    debug,
    limits,
    postmark,
    ai,
    context,
  } satisfies Record<string, Anonymizable>,
).reduce((obj, [key, value]) => ({
  ...obj,
  [key]: value.asAnonymous(),
}), {});

function requiredStringEnvVar(varName: string): string {
  const value = Deno.env.get(varName);
  if (!value) {
    throw new Error(
      `${varName} is required to be set before the application can start`,
    );
  }

  return value;
}

function booleanEnvVar(varName: string, defaultValue = false): boolean {
  const value = Deno.env.get(varName);
  return value ? Boolean(value) : defaultValue;
}

function numberEnvVar(varName: string): number | undefined {
  const value = Deno.env.get(varName);
  return value ? Number(value) : undefined;
}

function decodeB64EnvVarAsString(varName: string): string | undefined {
  return decodeB64EnvVarAs(varName, (input) => input);
}

function decodeB64EnvVarAs<T>(
  varName: string,
  fn: (input: string) => T,
): T | undefined {
  const textDecoder = new TextDecoder();
  const encoded = Deno.env.get(varName);
  return encoded !== undefined
    ? fn(textDecoder.decode(decodeBase64(encoded)))
    : encoded;
}

interface Anonymizable {
  asAnonymous: () => unknown;
}

function implementAnonymizedSerialization<T>(
  target: T,
  secrets: Array<keyof T> = [],
): T & Anonymizable {
  return {
    ...target,
    asAnonymous: (): Record<keyof T, unknown> => {
      const clone: Record<keyof T, unknown> = { ...structuredClone(target) };
      for (const secret of secrets) {
        const property = clone[secret];
        if (Array.isArray(property)) {
          clone[secret] = "***[array]***";
        } else if (typeof property === "object" && property) {
          clone[secret] = "***{object}***";
        } else if (typeof property === "boolean") {
          clone[secret] = "***boolean***";
        } else if (typeof property === "number") {
          clone[secret] = "***number***";
        } else if (typeof property === "string") {
          clone[secret] = "***string***";
        } else if (property == null) {
          clone[secret] = "***null/undefined***";
        } else {
          clone[secret] = "***other***";
        }
      }
      return clone;
    },
  };
}
