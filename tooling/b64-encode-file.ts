import { encodeBase64 } from "jsr:@std/encoding/base64";
import { parseArgs } from "jsr:@std/cli/parse-args";

const {
  "input-file": inputFile,
  "output-file": outputFiles,
  "secret-name": secretName,
} = parseArgs(Deno.args, {
  string: ["input-file", "secret-name", "output-file"],
  collect: ['output-file'],
  alias: {
    "input-file": ["i", "input"],
    "output-file": ["o", "output"],
    "secret-name": ["s", "secret"],
  },
});

if (!inputFile) {
  throw new Error(
    "An input file name is required, e.g. employees.json or storyline.txt",
  );
} else if (!outputFiles.length) {
  throw new Error("At least one output file name is required, e.g. .env or .env.dev");
} else if (!secretName) {
  throw new Error(
    "A secret name is required, e.g. B64_ENCODED_EMPLOYEES or B64_ENCODED_STORYLINE",
  );
}

const inputText = await Deno.readTextFile(inputFile);
const encoded = encodeBase64(inputText);

const regex = RegExp(`${secretName}=.*\n?`, 'g');
for (const outputFile of outputFiles) {
  const outputText = await Deno.readTextFile(outputFile);
  await Deno.writeTextFile(outputFile, outputText.replaceAll(regex, `${secretName}=${encoded}\n`));
}
