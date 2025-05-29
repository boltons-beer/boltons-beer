import {employees} from './env.ts';
import commonPrompt from './prompt.ts';

import {
    Employee,
    EmployeeList,
    EmployeeWithPrompt,
} from './models.ts';

const formatPromptLine = (items?: string[]) => {
    if (!items?.length) {
        return '- Nothing of note';
    }

    return items.map((item) => `- ${item}`).join('\n');
}

const formatPrompt = ({
    name,
    jobDetails,
    background,
    personality,
    hopes,
    fears,
    likes,
    dislikes,
}: Employee) => `You are ${name}.

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
 
${commonPrompt}`;

const parseEmployees = (rawEmployees: unknown[]): EmployeeWithPrompt[] =>
    EmployeeList.parse(rawEmployees).map((employee) => ({
      ...employee,
      prompt: formatPrompt(employee),
    }));

export const employeesWithPrompts = parseEmployees(employees);