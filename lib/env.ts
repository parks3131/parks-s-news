const required = ['OPENROUTER_API_KEY', 'REASONING_MODEL'] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  openRouterApiKey: process.env.OPENROUTER_API_KEY!,
  reasoningModel: process.env.REASONING_MODEL!,
};
