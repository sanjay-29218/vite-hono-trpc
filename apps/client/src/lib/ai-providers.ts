import { customProvider, gateway } from "ai";

export type ProviderMeta = {
  id: string;
  name: string;
  /** Suggested env var for key; may be unused for some providers (e.g. Ollama/Bedrock). */
  envVar?: string;
  /** Placeholder hint for the input */
  placeholder?: string;
  /** Optional docs url */
  docsUrl?: string;
  /** Corresponding AI SDK package name if available */
  pkg?: string;
  /** Mark as popular to show by default */
  popular?: boolean;
  models?: Record<
    string,
    {
      key: string;
      name: string;
    }
  >;
};

// Curated list aligned with AI SDK provider packages
export const ALL_PROVIDER_META: ProviderMeta[] = [
  // {
  //   id: "openai",
  //   name: "OpenAI",
  //   envVar: "OPENAI_API_KEY",
  //   placeholder: "sk-...",
  //   pkg: "@ai-sdk/openai",
  //   popular: true,
  //   models: {
  //     "gpt-4o": {
  //       key: "gpt-4o",
  //       name: "GPT-4o",
  //     },
  //     "gpt-4o-mini": {
  //       key: "gpt-4o-mini",
  //       name: "GPT-4o Mini",
  //     },
  //   },
  // },
  {
    id: "google",
    name: "Google (Gemini)",
    envVar: "GOOGLE_GENERATIVE_AI_API_KEY",
    placeholder: "AIza...",
    pkg: "@ai-sdk/google",
    popular: true,
    models: {
      "gemini-2.5-flash": {
        key: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
      },
      "gemini-2.5-flash-lite": {
        key: "gemini-2.5-flash-lite",
        name: "Gemini 2.5 Flash Lite",
      },
    },
  },
];

// list of providers for custom provider
export const PROVIDERS = customProvider({
  languageModels: {
    "gemini-2.5-flash": gateway.languageModel("gemini-2.5-flash"),
    "gemini-2.5-flash-lite": gateway.languageModel("gemini-2.5-flash-lite"),
    // "gpt-4o": gateway.languageModel("gpt-4o"),
    // "gpt-4o-mini": gateway.languageModel("gpt-4o-mini"),
  },
});

export const POPULAR_PROVIDER_IDS = ALL_PROVIDER_META.filter(
  (p) => p.popular,
).map((p) => p.id);

export function findProvider(id: string): ProviderMeta | undefined {
  return ALL_PROVIDER_META.find((p) => p.id === id);
}
