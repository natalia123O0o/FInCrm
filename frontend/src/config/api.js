const configuredUrl = import.meta.env.VITE_API_URL?.trim();

export const API_BASE_URL = (
  configuredUrl ||
  (import.meta.env.DEV ? "http://localhost:4000" : "")
).replace(/\/+$/, "");

export function requireApiUrl() {
  if (!API_BASE_URL) {
    throw new Error(
      "FinCRM no tiene configurada una API pública. " +
      "Configura VITE_API_URL para conectar el backend."
    );
  }

  return API_BASE_URL;
}
