import { stringify } from "https://deno.land/std@0.224.0/csv/stringify.ts";
import { format } from "https://deno.land/std@0.224.0/datetime/mod.ts";
import {
  dirname,
  fromFileUrl,
  join,
} from "https://deno.land/std@0.224.0/path/mod.ts";
import { parseArgs } from "jsr:@std/cli/parse-args";

const API_BASE_URL = "https://api.postmarkapp.com";

const CSV_FILE_NAME = "postmark_sent_emails.csv";
const BATCH_SIZE = 500;

interface PostmarkRecipient {
  Email: string;
  Name?: string;
}

interface PostmarkMessage {
  MessageID: string;
  To: PostmarkRecipient[];
  Cc: PostmarkRecipient[];
  Bcc: PostmarkRecipient[];
  From: string;
  Subject: string;
  Status: string;
  TextBody: string | null;
  SentAt: string;
  Tag?: string;
  Recipients?: string[];
  ReceivedAt?: string;
  Attachments?: any[];
  TrackOpens?: boolean;
  TrackLinks?: "None" | "HtmlAndText" | "HtmlOnly" | "TextOnly";
  HtmlBody?: string | null;
  MessageStream?: string;
}

interface ApiResponse {
  TotalCount: number;
  Messages: PostmarkMessage[];
}

async function fetchMessagesBatch(
  offset: number,
  apiToken: string,
): Promise<ApiResponse> {
  const url = `${API_BASE_URL}/messages/outbound?count=${BATCH_SIZE}&offset=${offset}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "X-Postmark-Server-Token": apiToken,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Postmark API request failed: ${response.status} - ${errorBody}`,
    );
  }

  return response.json();
}

async function fetchMessageDetails(
  messageId: string,
  apiToken: string,
): Promise<PostmarkMessage> {
  const url = `${API_BASE_URL}/messages/outbound/${messageId}/details`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "X-Postmark-Server-Token": apiToken,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Postmark API request failed: ${response.status} - ${errorBody}`,
    );
  }

  return response.json();
}

async function getAllMessages(apiToken: string): Promise<PostmarkMessage[]> {
  let allMessages: PostmarkMessage[] = [];
  let offset = 0;
  let totalFetchedSoFar = 0;
  let totalToFetch = Infinity;

  console.log("Fetching Postmark messages...");

  const initialResponse = await fetchMessagesBatch(0, apiToken);
  totalToFetch = initialResponse.TotalCount;
  allMessages = allMessages.concat(initialResponse.Messages);
  totalFetchedSoFar += initialResponse.Messages.length;
  offset = initialResponse.Messages.length;

  while (totalFetchedSoFar < totalToFetch) {
    await new Promise((resolve) => setTimeout(resolve, 250));

    const apiResponse = await fetchMessagesBatch(offset, apiToken);
    const messagesBatch = apiResponse.Messages;

    if (messagesBatch.length === 0) break;

    console.log("Fetching details...");
    for (const message of messagesBatch) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      console.log(`\tFetching details for ${message.MessageID}`);
      const details = await fetchMessageDetails(message.MessageID, apiToken);
      allMessages.push({ ...message, ...details });
    }

    totalFetchedSoFar += messagesBatch.length;
    offset += messagesBatch.length;
    console.log(`Progress: ${totalFetchedSoFar}/${totalToFetch}`);
  }

  return allMessages;
}

function extractEmail(fullAddress: string): string {
  if (!fullAddress) return "";
  const match = fullAddress.match(/<([^>]+)>/);
  return match ? match[1] : fullAddress;
}

function formatRecipientList(
  recipients: PostmarkRecipient[] | undefined,
): string {
  if (!recipients || recipients.length === 0) return "";
  return recipients.map((r) => r.Email).join(", ");
}

const {
  "postmark-token": apiToken,
  "output": outputFile,
} = parseArgs(Deno.args, {
  string: ["postmark-token", "output"],
  alias: {
    "postmark-token": ["t"],
    "output": ["o"],
  },
  default: {
    "postmark-token": Deno.env.get("POSTMARK_SERVER_TOKEN") ?? "",
    "output": CSV_FILE_NAME,
  },
});

if (!apiToken) {
  throw new Error(
    "Postmark Server Token is required. Use --postmark-token or -t flag, or set POSTMARK_SERVER_TOKEN environment variable.",
  );
}

const csvHeaders = ["datetime", "from", "to", "cc", "bcc", "subject", "body"];
const allMessages = await getAllMessages(apiToken);

if (allMessages.length === 0) {
  throw new Error(
    "No messages found or fetched from Postmark.",
  );
}

const sentMessages = allMessages.filter((msg) => msg.Status === "Sent");

if (sentMessages.length === 0) {
  throw new Error("No sent messages found to export.");
}

const csvData = sentMessages.map((msg) => ({
  datetime: msg.SentAt
    ? format(new Date(msg.SentAt), "yyyy-MM-dd HH:mm:ss")
    : "",
  from: extractEmail(msg.From),
  to: formatRecipientList(msg.To),
  cc: formatRecipientList(msg.Cc),
  bcc: formatRecipientList(msg.Bcc),
  subject: msg.Subject || "",
  body: msg.TextBody || "", // Use TextBody for simple text body
}));

const csvString = stringify(csvData, {
  columns: csvHeaders,
  headers: csvHeaders,
});

const scriptDirPath = dirname(fromFileUrl(import.meta.url));
const outputFilePath = join(scriptDirPath, outputFile);

await Deno.writeTextFile(outputFilePath, csvString);
console.log(`Exported ${sentMessages.length} emails to ${outputFilePath}`);
