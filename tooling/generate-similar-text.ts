import { parseArgs } from "jsr:@std/cli/parse-args";
import OpenAI from "npm:openai@4.103.0";
import { randomIntFromInterval } from "../employee-jabber/src/utils.ts";

const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");

const {
  "prompt": prompt,
  "input-file": inputFile,
} = parseArgs(Deno.args, {
  string: ["input-file", "prompt"],
  alias: {
    "input-file": ["i", "input"],
    "prompt": ["p"],
  },
});

if (!inputFile) {
  throw new Error(
    "An input file name is required, e.g. employees.json or employees.prod.json",
  );
} else if (!deepseekApiKey) {
  throw new Error(
    "Missing env var DEEPSEEK_API_KEY",
  );
}

const inputText = await Deno.readTextFile(inputFile);
const systemPrompt =
  `You are an extremely skilled writer and expert pattern matcher. 

You are going to be provided with a prompt and a sample piece of text. Your job is to match the style, contents, and format of the sample and write your own version.

Feel free to be creative and take some liberties, so long as you follow the spirit of what is in the sample.

Here is the prompt:

${prompt ?? "Please match as closely as possible"}

Here is a sample:

\`\`\`
${inputText}
\`\`\`
`;

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: deepseekApiKey,
});

const completion = await openai.chat.completions.create({
  model: "deepseek-reasoner",
  temperature: randomIntFromInterval(0.01, 0.6),
  messages: [
    {
      role: "system",
      content: systemPrompt,
    },
  ],
});

const response = completion?.choices?.[0]?.message?.content;
if (response) {
  console.log(response);
} else {
  console.log("No response generated");
}
