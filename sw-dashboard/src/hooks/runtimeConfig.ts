export interface RuntimeConfig {
  apiBaseUrl: string;
}

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    const resp = await fetch("/config.json");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const cfg = await resp.json() as Partial<RuntimeConfig>;
    return {
      apiBaseUrl: cfg.apiBaseUrl ?? "/api/",
    };
  } catch (err) {
    console.warn("Runtime config not found, defaulting to /api/", err);
    return { apiBaseUrl: "/api/" };
  }
}