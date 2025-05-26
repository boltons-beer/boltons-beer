import { parseArgs } from "jsr:@std/cli/parse-args";

const {
    "input-file": inputFile,
} = parseArgs(Deno.args, {
    string: ["input-file"],
    alias: {
        "input-file": ["i", "input"],
    },
});

if (!inputFile) {
    throw new Error(
        "An input file name is required, e.g. .env or .env.prod",
    );
}

const inputText = await Deno.readTextFile(inputFile);
const entries = inputText.split('\n');

for (const entry of entries) {
    if (!entry) {
        continue;
    }

    const cmd = new Deno.Command("fly", { args: ["secrets", "set", entry] });
    const { stdout, stderr } = await cmd.output();
    if (stdout.length) {
        const textDecoder = new TextDecoder();
        console.log(textDecoder.decode(stdout));
    }

    if (stderr.length) {
        const textDecoder = new TextDecoder();
        console.error(textDecoder.decode(stdout));
    }
}
