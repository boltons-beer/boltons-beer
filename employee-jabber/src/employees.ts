import * as Env from "./env.ts";
import commonPrompt from "./prompt.ts";

import {
  CoworkerSummary,
  Employee,
  EmployeeList,
  EmployeeWithPrompt,
} from "./models.ts";

const formatPromptLine = (items?: string[]) => {
  if (!items?.length) {
    return "- Nothing of note";
  }

  return items.map((item) => `- ${item}`).join("\n");
};

const formatCoworkerSummaries = (summaries: CoworkerSummary[]) => {
  if (!summaries?.length) {
    return "- No one of note";
  }

  return summaries.map(({ name, email, jobDetails }) => {
    const jobLines = jobDetails
      ? jobDetails.map((detail) => `\t- ${detail}`).join("\n")
      : null;
    return `- ${name} (${email})${jobLines && `\n${jobLines}`}`;
  }).join("\n");
};

const formatPrompt = ({
  name,
  jobDetails,
  background,
  personality,
  hopes,
  fears,
  likes,
  dislikes,
  coworkerSummaries,
}: Employee & { coworkerSummaries: CoworkerSummary[] }) =>
  `You are ${name}.

Your job details are:

${formatPromptLine(jobDetails)}

Your background is:

${formatPromptLine(background)}

Your personality is:
 
${formatPromptLine(personality)}

Your hopes are:

${formatPromptLine(hopes)}
 
Your fears are:

${formatPromptLine(fears)}
 
Your likes are: 

${formatPromptLine(likes)}
 
Your dislikes are: 

${formatPromptLine(dislikes)}

Here is a (non-exhaustive) list of your coworkers:

${formatCoworkerSummaries(coworkerSummaries)}
 
${commonPrompt}`;

const parseEmployees = (rawEmployees: unknown[]): EmployeeWithPrompt[] => {
  const list = EmployeeList.parse(rawEmployees);
  const coworkerSummaries: CoworkerSummary[] = list.map((
    { name, email, jobDetails },
  ) => ({
    name,
    email,
    jobDetails: jobDetails ?? [],
  }));
  return list.map((employee) => {
    const otherSummaries = coworkerSummaries
      .filter(({ email }) => email !== employee.email);
    return {
      ...employee,
      prompt: formatPrompt({
        ...employee,
        coworkerSummaries: otherSummaries,
      }),
    };
  });
};

export const employeesWithPrompts = parseEmployees(Env.context.employees);
