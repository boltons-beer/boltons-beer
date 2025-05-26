import { z } from 'npm:zod';

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

export const EmployeeWithPrompt = Employee.extend({
    prompt: z.string(),
});
export type EmployeeWithPrompt = z.infer<typeof EmployeeWithPrompt>;

export const EmployeeList = z.array(Employee);
