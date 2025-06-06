import { z } from "zod/v4";

export const EmailAddress = z.string().email();
export type EmailAddress = z.infer<typeof EmailAddress>;

export const InboundEmail = z.object({
  From: EmailAddress,
  To: z.string(),
  Cc: z.string().optional(),
  Bcc: z.string().optional(),
  OriginalRecipient: EmailAddress,
  Subject: z.string(),
  MessageID: z.string(),
  TextBody: z.string().optional(),
  HtmlBody: z.string().optional(),
});
export type InboundEmail = z.infer<typeof InboundEmail>;

export const Employee = z.object({
  name: z.string(),
  email: EmailAddress,
  bskyIdentifier: z.string(),
  bskyPassword: z.string(),
  jobDetails: z.string().array().optional(),
  background: z.string().array().optional(),
  personality: z.string().array().optional(),
  hopes: z.string().array().optional(),
  fears: z.string().array().optional(),
  likes: z.string().array().optional(),
  dislikes: z.string().array().optional(),
});
export type Employee = z.infer<typeof Employee>;

export const CoworkerSummary = z.object({
  name: z.string(),
  email: EmailAddress,
  jobDetails: z.string().array(),
});
export type CoworkerSummary = z.infer<typeof CoworkerSummary>;

export const EmployeeWithPrompt = Employee.extend({
  prompt: z.string(),
});
export type EmployeeWithPrompt = z.infer<typeof EmployeeWithPrompt>;

export const EmployeeList = z.array(Employee);

export const EmailSendAction = z.object({
  kind: z.literal("email-send"),
  to: z.string().email(),
  cc: z.string().email().array().optional(),
  subject: z.string(),
  body: z.string(),
});
export type EmailSendAction = z.infer<typeof EmailSendAction>;

export const BskyPostAction = z.object({
  kind: z.literal("bsky-post"),
  content: z.string().max(300),
});
export type BskyPostAction = z.infer<typeof BskyPostAction>;

export const BskyThreadAction = z.object({
  kind: z.literal("bsky-thread"),
  content: z.string().max(300).array().min(1),
});
export type BskyThreadAction = z.infer<typeof BskyThreadAction>;

export const AiNextAction = z.discriminatedUnion("kind", [
  EmailSendAction,
  BskyPostAction,
  BskyThreadAction,
]);
export type AiNextAction = z.infer<typeof AiNextAction>;

export const AiNextActionList = AiNextAction.array().min(1);
