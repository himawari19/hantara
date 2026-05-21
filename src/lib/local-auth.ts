/**
 * Local authentication for development/demo mode.
 * Works without Supabase — credentials stored in memory.
 */

export interface LocalUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
}

// Default local accounts
const LOCAL_ACCOUNTS: { email: string; password: string; user: LocalUser }[] = [
  {
    email: "admin@hantara.lokal",
    password: "admin123",
    user: {
      id: "local-admin-001",
      email: "admin@hantara.lokal",
      name: "Admin",
      role: "admin",
    },
  },
];

const STORAGE_KEY = "hantara-local-auth";
const ACCOUNTS_KEY = "hantara-local-accounts";

function getStoredAccounts(): typeof LOCAL_ACCOUNTS {
  if (typeof window === "undefined") return LOCAL_ACCOUNTS;
  try {
    const stored = localStorage.getItem(ACCOUNTS_KEY);
    if (stored) {
      return [...LOCAL_ACCOUNTS, ...JSON.parse(stored)];
    }
  } catch {
    // ignore
  }
  return LOCAL_ACCOUNTS;
}

export function localSignIn(email: string, password: string): { user: LocalUser | null; error: string | null } {
  const accounts = getStoredAccounts();
  const account = accounts.find(
    (a) => a.email.toLowerCase() === email.toLowerCase() && a.password === password
  );

  if (!account) {
    return { user: null, error: "Invalid email or password" };
  }

  // Save session to localStorage
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(account.user));
  }

  return { user: account.user, error: null };
}

export function localSignUp(email: string, password: string, name: string): { user: LocalUser | null; error: string | null } {
  const accounts = getStoredAccounts();

  // Check if email already exists
  if (accounts.some((a) => a.email.toLowerCase() === email.toLowerCase())) {
    return { user: null, error: "Email already registered" };
  }

  const newUser: LocalUser = {
    id: "local-" + Math.random().toString(36).substring(2, 10),
    email,
    name,
    role: "user",
  };

  // Store new account
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(ACCOUNTS_KEY);
      const existing = stored ? JSON.parse(stored) : [];
      existing.push({ email, password, user: newUser });
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(existing));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    } catch {
      // ignore
    }
  }

  return { user: newUser, error: null };
}

export function localGetSession(): LocalUser | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return null;
}

export function localSignOut(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}
