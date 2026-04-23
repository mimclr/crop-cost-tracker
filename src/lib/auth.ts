export const authorizedEmails = [
  "iago.parmanhani@laborrural.com",
  "analistas@laborrural.com",
  "internos@laborrural.com",
  "josias.amaral@laborrural.com",
  "produtor@laborrural.com",
];

const SESSION_KEY = "custos_agro_session_email";

export function isAuthorized(email: string): boolean {
  return authorizedEmails.includes(email.trim().toLowerCase());
}

export function getSessionEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

export function setSessionEmail(email: string): void {
  localStorage.setItem(SESSION_KEY, email.trim().toLowerCase());
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
