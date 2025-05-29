import postmark from "npm:postmark@^4.0.5";

import { Err, Ok, Result } from "./result.ts";
import { EmailAddress, Employee } from "./models.ts";
import * as Db from "./persistence.ts";
import { postmarkApiKey } from "./env.ts";

const client = new postmark.ServerClient(postmarkApiKey);

type SendArgs = {
  employee: Employee;
  to: EmailAddress;
  cc?: EmailAddress[];
  subject: string;
  body: string;
};
export async function send({
  employee,
  to,
  cc = [],
  subject,
  body,
}: SendArgs): Promise<Result<void>> {
  if (!Db.exists("employees", to)) {
    return Err.wrap(new Error("To address not whitelisted"));
  }

  try {
    await client.sendEmail({
      "From": employee.email,
      "To": to,
      "Cc": cc.filter((email) => Db.exists("employees", email)).join(","),
      // "Bcc": 'brand@mail.boltons.beer',
      "Subject": subject,
      "TextBody": body,
    });
  } catch (e) {
    return Err.wrap(new Error("Error sending email", { cause: e as Error }));
  }

  return Ok.wrap(undefined);
}
