import { SettingsDB } from "./db";

const settingsDB = new SettingsDB();
const AUTH_KEY = "yodha_admin_authenticated";
const BOOTH_TOKEN_KEY = "yodha_booth_session_token";

export async function getAdminPin(): Promise<string> {
  return await settingsDB.getSetting<string>("admin_pin", "1234");
}

export async function setAdminPin(newPin: string): Promise<void> {
  await settingsDB.saveSetting<string>("admin_pin", newPin);
}

export function isAdminAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AUTH_KEY) === "true";
}

export async function verifyAndLoginAdmin(pinInput: string): Promise<boolean> {
  const currentPin = await getAdminPin();
  if (pinInput.trim() === currentPin.trim()) {
    localStorage.setItem(AUTH_KEY, "true");
    // Also create a booth session token
    createBoothSession();
    return true;
  }
  return false;
}

export function logoutAdmin(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(BOOTH_TOKEN_KEY);
}

export function createBoothSession(): string {
  const token = `booth_sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  localStorage.setItem(BOOTH_TOKEN_KEY, token);
  return token;
}

export function isBoothAccessAllowed(): boolean {
  if (typeof window === "undefined") return false;
  // Allowed if admin is authenticated OR valid booth token exists
  return (
    localStorage.getItem(AUTH_KEY) === "true" ||
    !!localStorage.getItem(BOOTH_TOKEN_KEY)
  );
}
