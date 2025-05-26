import { decodeBase64 } from 'jsr:@std/encoding/base64';

export const enableDebugStats = booleanEnvVar('ENABLE_DEBUG_STATS');
export const postmarkWebhookUsername = requiredStringEnvVar('POSTMARK_WEBHOOK_USERNAME');
export const postmarkWebhookPassword = requiredStringEnvVar('POSTMARK_WEBHOOK_PASSWORD');
export const deepseekApiKey = requiredStringEnvVar('DEEPSEEK_API_KEY');
export const employees = decodeB64EnvVarAs<unknown[]>('B64_ENCODED_EMPLOYEES', JSON.parse) ?? [];
export const storyline = decodeB64EnvVarAsString('B64_ENCODED_STORYLINE') ?? 'Not remarkable';

function requiredStringEnvVar(varName: string): string {
    const value = Deno.env.get(varName);
    if (!value) {
        throw new Error(`${varName} is required to be set before the application can start`);
    }

    return value;
}

function booleanEnvVar(varName: string, defaultValue = false): boolean {
    const value = Deno.env.get(varName);
    return value ? Boolean(value) : defaultValue;
}

function decodeB64EnvVarAsString(varName: string): string | undefined {
    return decodeB64EnvVarAs(varName, (input) => input);
}

function decodeB64EnvVarAs<T>(
    varName: string,
    fn: (input: string) => T,
): T | undefined {
    const textDecoder = new TextDecoder();
    const encoded = Deno.env.get(varName);
    return encoded !== undefined ? fn(textDecoder.decode(decodeBase64(encoded))) : encoded;
}