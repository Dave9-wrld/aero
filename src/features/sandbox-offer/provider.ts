import type { SearchCriteria } from "../flight-search/types";
import { searchToParams } from "../flight-search/model";
import type { SandboxOfferDetails } from "./types";

export interface OfferDetailsProvider {
  get(
    id: string,
    criteria: SearchCriteria,
    signal: AbortSignal,
  ): Promise<SandboxOfferDetails>;
}

export const sandboxOfferProvider: OfferDetailsProvider = {
  async get(id, criteria, signal) {
    const response = await fetch(
      `/api/flights/offers/${encodeURIComponent(id)}?${searchToParams(criteria)}`,
      { signal, cache: "no-store" },
    );
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error ?? "This offer could not be loaded.");
    return result;
  },
};
