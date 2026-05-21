import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

interface CookieState {
  cookies: Cookie[];
  addCookie: (cookie: Cookie) => void;
  addCookies: (cookies: Cookie[]) => void;
  removeCookie: (domain: string, name: string) => void;
  clearDomain: (domain: string) => void;
  clearAll: () => void;
  getCookiesForDomain: (domain: string) => Cookie[];
  getCookieHeader: (url: string) => string;
}

export const useCookieStore = create<CookieState>()(
  persist(
    (set, get) => ({
      cookies: [],

      addCookie: (cookie) => {
        set((state) => {
          // Replace existing cookie with same name+domain
          const filtered = state.cookies.filter(
            (c) => !(c.name === cookie.name && c.domain === cookie.domain && c.path === cookie.path)
          );
          return { cookies: [...filtered, cookie] };
        });
      },

      addCookies: (newCookies) => {
        set((state) => {
          let cookies = [...state.cookies];
          for (const cookie of newCookies) {
            cookies = cookies.filter(
              (c) => !(c.name === cookie.name && c.domain === cookie.domain && c.path === cookie.path)
            );
            cookies.push(cookie);
          }
          return { cookies };
        });
      },

      removeCookie: (domain, name) => {
        set((state) => ({
          cookies: state.cookies.filter((c) => !(c.domain === domain && c.name === name)),
        }));
      },

      clearDomain: (domain) => {
        set((state) => ({
          cookies: state.cookies.filter((c) => c.domain !== domain),
        }));
      },

      clearAll: () => set({ cookies: [] }),

      getCookiesForDomain: (domain) => {
        const { cookies } = get();
        return cookies.filter((c) => {
          // Match domain (including subdomains)
          if (c.domain === domain) return true;
          if (c.domain.startsWith(".") && domain.endsWith(c.domain)) return true;
          if (domain.endsWith("." + c.domain)) return true;
          return false;
        });
      },

      getCookieHeader: (url) => {
        try {
          const urlObj = new URL(url);
          const domain = urlObj.hostname;
          const path = urlObj.pathname;
          const isSecure = urlObj.protocol === "https:";

          const { cookies } = get();
          const matching = cookies.filter((c) => {
            // Domain match
            const domainMatch =
              c.domain === domain ||
              (c.domain.startsWith(".") && domain.endsWith(c.domain)) ||
              domain.endsWith("." + c.domain);
            if (!domainMatch) return false;

            // Path match
            if (!path.startsWith(c.path)) return false;

            // Secure check
            if (c.secure && !isSecure) return false;

            // Expiry check
            if (c.expires) {
              const expDate = new Date(c.expires);
              if (expDate < new Date()) return false;
            }

            return true;
          });

          return matching.map((c) => `${c.name}=${c.value}`).join("; ");
        } catch {
          return "";
        }
      },
    }),
    { name: "hantara-cookies" }
  )
);
