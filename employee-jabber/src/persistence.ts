import { EmployeeWithPrompt } from "./models.ts";
import { employeesWithPrompts } from "./employees.ts";
import { Client } from "@atcute/client";
import { Did } from "@atcute/lexicons";

export type ChatMessage = {
  chatMessageId: string;
  role: "assistant" | "user" | "system";
  content: string;
};
const conversationsByEmail = new Map<string, ChatMessage[]>();

export type ATProtoData = { client: Client; did: Did; pdsUri?: string };
const atProtoDataByEmail = new Map<string, ATProtoData>();

const employeeByEmail = employeesWithPrompts.reduce((acc, employee) => {
  acc.set(employee.email, employee);
  return acc;
}, new Map<string, EmployeeWithPrompt>());

export function rows(collection: "conversations"): [string, ChatMessage[]][];
export function rows(collection: "atProtoData"): [string, ATProtoData][];
export function rows(collection: "employees"): [string, EmployeeWithPrompt][];
export function rows(
  collection: "conversations" | "atProtoData" | "employees",
): [string, ChatMessage[]][] | [string, ATProtoData][] | [
  string,
  EmployeeWithPrompt,
][] {
  switch (collection) {
    case "conversations":
      return [...structuredClone(conversationsByEmail).entries()];
    case "atProtoData": {
      return [...atProtoDataByEmail.entries()].map(([key, value]) => {
        const { client, ...rest } = value;
        return [key, { ...structuredClone(rest), client }];
      });
    }
    case "employees":
      return [...structuredClone(employeeByEmail).entries()];
  }
}

export function exists(
  collection: "conversations" | "atProtoData" | "employees",
  key: string,
): boolean {
  switch (collection) {
    case "conversations":
      return conversationsByEmail.has(key);
    case "atProtoData":
      return atProtoDataByEmail.has(key);
    case "employees":
      return employeeByEmail.has(key);
  }
}

export function query(
  collection: "conversations",
  key: string,
): ChatMessage[] | undefined;
export function query(
  collection: "conversations",
  key: string,
  defaultValue: ChatMessage[],
): ChatMessage[];
export function query(
  collection: "atProtoData",
  key: string,
): ATProtoData | undefined;
export function query(
  collection: "atProtoData",
  key: string,
  defaultValue: ATProtoData,
): ATProtoData;
export function query(
  collection: "employees",
  key: string,
): EmployeeWithPrompt | undefined;
export function query(
  collection: "employees",
  key: string,
  defaultValue: EmployeeWithPrompt,
): EmployeeWithPrompt;
export function query(
  collection: "conversations" | "atProtoData" | "employees",
  key: string,
  defaultValue?: ChatMessage[] | ATProtoData | EmployeeWithPrompt,
): ChatMessage[] | ATProtoData | EmployeeWithPrompt | undefined {
  switch (collection) {
    case "conversations":
      return structuredClone(conversationsByEmail.get(key)) ?? defaultValue;
    case "atProtoData": {
      const value = atProtoDataByEmail.get(key);
      if (!value) {
        return defaultValue;
      }
      const { client, ...rest } = value;
      return { ...structuredClone(rest), client };
    }
    case "employees":
      return structuredClone(employeeByEmail.get(key)) ?? defaultValue;
  }
}

export function upsert(
  collection: "conversations",
  key: string,
  value: ChatMessage[],
): Map<string, ChatMessage[]>;
export function upsert(
  collection: "atProtoData",
  key: string,
  value: ATProtoData,
): Map<string, ATProtoData>;
export function upsert(
  collection: "employees",
  key: string,
  value: EmployeeWithPrompt,
): Map<string, EmployeeWithPrompt>;
export function upsert(
  collection: "conversations" | "atProtoData" | "employees",
  key: string,
  value: ChatMessage[] | ATProtoData | EmployeeWithPrompt,
):
  | Map<string, ChatMessage[]>
  | Map<string, ATProtoData>
  | Map<string, EmployeeWithPrompt> {
  switch (collection) {
    case "conversations":
      return conversationsByEmail.set(key, value as ChatMessage[]);
    case "atProtoData":
      return atProtoDataByEmail.set(key, value as ATProtoData);
    case "employees":
      return employeeByEmail.set(key, value as EmployeeWithPrompt);
  }
}

export function del(
  collection: "conversations" | "atProtoData" | "employees",
  key: string,
): boolean {
  switch (collection) {
    case "conversations":
      return conversationsByEmail.delete(key);
    case "atProtoData":
      return atProtoDataByEmail.delete(key);
    case "employees":
      return employeeByEmail.delete(key);
  }
}
