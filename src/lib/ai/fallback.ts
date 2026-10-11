import type { LanguageModel } from "ai";

/** Tries each model in order; moves to the next if a call fails before streaming. */
export function fallbackModel(models: LanguageModel[]): LanguageModel {
  const list = models as Exclude<LanguageModel, string>[];
  if (list.length <= 1) return list[0] as LanguageModel;
  const first = list[0] as any;
  const run = async (method: "doGenerate" | "doStream", opts: unknown) => {
    let lastError: unknown;
    for (const m of list as any[]) {
      try {
        return await m[method](opts);
      } catch (e) {
        if ((opts as { abortSignal?: AbortSignal })?.abortSignal?.aborted) throw e;
        lastError = e;
      }
    }
    throw lastError;
  };
  return {
    specificationVersion: first.specificationVersion,
    provider: first.provider,
    modelId: first.modelId,
    supportedUrls: first.supportedUrls,
    doGenerate: (opts: unknown) => run("doGenerate", opts),
    doStream: (opts: unknown) => run("doStream", opts),
  } as unknown as LanguageModel;
}
