import { z } from 'npm:zod';

export const EmailAddress = z.string().email();
export type EmailAddress = z.infer<typeof EmailAddress>;

export const HeaderEntry = z.object({
    Name: z.string(),
    Value: z.string()
});
export type HeaderEntry = z.infer<typeof HeaderEntry>;

export const Attachment = z.object({
    Name: z.string(),
    Content: z.string(),
    ContentType: z.string(),
    ContentLength: z.number()
});
export type Attachment = z.infer<typeof Attachment>;

export const FullRecipient = z.object({
    Email: EmailAddress,
    Name: z.string().optional(),
    MailboxHash: z.string().optional()
});
export type FullRecipient = z.infer<typeof FullRecipient>;

export const InboundEmail = z.object({
    FromName: z.string(),
    MessageStream: z.string(),
    From: EmailAddress,
    FromFull: FullRecipient,
    To: z.string(),
    ToFull: z.array(FullRecipient),
    Cc: z.string().optional(),
    CcFull: z.array(FullRecipient).optional(),
    Bcc: z.string().optional(),
    BccFull: z.array(FullRecipient).optional(),
    OriginalRecipient: EmailAddress,
    Subject: z.string(),
    MessageID: z.string(),
    ReplyTo: EmailAddress,
    MailboxHash: z.string(),
    Date: z.string(),
    TextBody: z.string().min(1),
    HtmlBody: z.string().optional(),
    StrippedTextReply: z.string().optional(),
    Tag: z.string().optional(),
    Headers: z.array(HeaderEntry).optional(),
    Attachments: z.array(Attachment).optional()
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

export const EmployeeWithPrompt = Employee.extend({
    prompt: z.string(),
});
export type EmployeeWithPrompt = z.infer<typeof EmployeeWithPrompt>;

export const EmployeeList = z.array(Employee);
