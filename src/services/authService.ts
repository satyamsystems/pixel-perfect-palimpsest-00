/**
 * AuthService for Trajectify.AI
 *
 * Integrated with Supabase Auth (`auth.users`) while maintaining seamless local
 * fallback when Supabase environment variables are not yet configured.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  initials: string;
}

export interface StoredAccount {
  id: string;
  name: string;
  email?: string;
  password?: string;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
}

const STORAGE_KEY_SESSION = "trajectify_current_user";
const STORAGE_KEY_ACCOUNTS = "trajectify_accounts";
const STORAGE_KEY_OTP = "trajectify_pending_otp";

class AuthService {
  private listeners: Set<(user: AuthUser | null) => void> = new Set();
  private cachedUser: AuthUser | null = null;
  private initialized: boolean = false;

  constructor() {
    this.cachedUser = this.getInitialUser();

    if (typeof window !== "undefined") {
      // Listen to cross-tab storage changes
      window.addEventListener("storage", (e) => {
        if (e.key === STORAGE_KEY_SESSION) {
          const user = this.getInitialUser();
          this.cachedUser = user;
          this.notify(user);
        }
      });

      // Wire into Supabase Auth state changes if configured
      if (isSupabaseConfigured()) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            const user = this.mapSupabaseUser(session.user);
            this.cachedUser = user;
            this.setCurrentUser(user);
          }
          this.initialized = true;
        });

        supabase.auth.onAuthStateChange(async (event, session) => {
          if (session?.user) {
            const user = this.mapSupabaseUser(session.user);
            this.cachedUser = user;
            this.setCurrentUser(user);
          } else if (event === "SIGNED_OUT") {
            this.cachedUser = null;
            this.setCurrentUser(null);
          }
        });
      }
    }
  }

  private mapSupabaseUser(sbUser: {
    id: string;
    email?: string;
    phone?: string;
    user_metadata?: Record<string, unknown>;
  }): AuthUser {
    const rawName =
      (sbUser.user_metadata?.full_name as string) ||
      (sbUser.user_metadata?.name as string) ||
      (sbUser.email ? sbUser.email.split("@")[0].replace(/[^a-zA-Z0-9]/g, " ") : "") ||
      "Student";

    const formattedName = rawName
      .trim()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");

    return {
      id: sbUser.id,
      name: formattedName,
      email: sbUser.email,
      phone: sbUser.phone,
      avatarUrl: (sbUser.user_metadata?.avatar_url as string) || undefined,
      initials: this.makeInitials(formattedName),
    };
  }

  private getInitialUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    try {
      const data = localStorage.getItem(STORAGE_KEY_SESSION);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private notify(user: AuthUser | null) {
    this.listeners.forEach((fn) => fn(user));
  }

  onAuthStateChange(cb: (user: AuthUser | null) => void): () => void {
    this.listeners.add(cb);
    cb(this.getCurrentUser());
    return () => this.listeners.delete(cb);
  }

  getCurrentUser(): AuthUser | null {
    if (this.cachedUser) return this.cachedUser;
    return this.getInitialUser();
  }

  private getAccounts(): StoredAccount[] {
    if (typeof window === "undefined") return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveAccounts(accounts: StoredAccount[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
  }

  private setCurrentUser(user: AuthUser | null) {
    this.cachedUser = user;
    if (typeof window === "undefined") return;
    if (user) {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_SESSION);
    }
    this.notify(user);
  }

  private makeInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (name.slice(0, 2) || "U").toUpperCase();
  }

  // Email/Password Login
  async loginWithEmail(email: string, pass: string, rememberMe: boolean = true): Promise<AuthUser> {
    const normalized = email.trim().toLowerCase();

    // 1. If Supabase is configured, use Supabase Auth
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalized,
        password: pass,
      });

      if (error) {
        throw new Error(error.message || "Failed to log in with email.");
      }

      if (!data.user) {
        throw new Error("User credentials verified, but no session returned.");
      }

      const authUser = this.mapSupabaseUser(data.user);
      this.setCurrentUser(authUser);
      return authUser;
    }

    // 2. Fallback to local accounts
    await new Promise((r) => setTimeout(r, 400));
    const accounts = this.getAccounts();
    const account = accounts.find((a) => a.email?.toLowerCase() === normalized);

    if (!account) {
      const name = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, " ") || "New User";
      const formattedName = name
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      const newUser: StoredAccount = {
        id: "usr_" + Math.random().toString(36).slice(2, 9),
        name: formattedName,
        email: normalized,
        password: pass,
        createdAt: new Date().toISOString(),
      };
      this.saveAccounts([...accounts, newUser]);

      const authUser: AuthUser = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        initials: this.makeInitials(newUser.name),
      };
      this.setCurrentUser(authUser);
      return authUser;
    }

    if (account.password && account.password !== pass) {
      throw new Error("Incorrect password. Please verify and try again.");
    }

    const authUser: AuthUser = {
      id: account.id,
      name: account.name,
      email: account.email,
      phone: account.phone,
      avatarUrl: account.avatarUrl,
      initials: this.makeInitials(account.name),
    };
    this.setCurrentUser(authUser);
    return authUser;
  }

  // Email Signup
  async signupWithEmail(name: string, email: string, pass: string): Promise<AuthUser> {
    const normalized = email.trim().toLowerCase();
    const trimmedName = name.trim();

    // 1. If Supabase is configured, use Supabase Auth signUp
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.auth.signUp({
        email: normalized,
        password: pass,
        options: {
          data: {
            full_name: trimmedName,
            name: trimmedName,
          },
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to create account.");
      }

      if (!data.user) {
        throw new Error("Account creation did not return a user record.");
      }

      let activeUser = data.user;
      if (!data.session) {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: normalized,
          password: pass,
        });
        if (!signInErr && signInData?.session && signInData.user) {
          activeUser = signInData.user;
        } else if (signInErr?.message?.toLowerCase().includes("email not confirmed")) {
          throw new Error(
            "Account registered! Email confirmation is enabled in your Supabase project. Please confirm your email or disable 'Confirm email' in Supabase Auth to enable instant login."
          );
        }
      }

      const authUser = this.mapSupabaseUser(activeUser);
      this.setCurrentUser(authUser);
      return authUser;
    }

    // 2. Fallback to local accounts
    await new Promise((r) => setTimeout(r, 450));
    const accounts = this.getAccounts();

    if (accounts.some((a) => a.email?.toLowerCase() === normalized)) {
      throw new Error("An account with this email already exists. Please log in.");
    }

    const newAccount: StoredAccount = {
      id: "usr_" + Math.random().toString(36).slice(2, 9),
      name: trimmedName,
      email: normalized,
      password: pass,
      createdAt: new Date().toISOString(),
    };
    this.saveAccounts([...accounts, newAccount]);

    const authUser: AuthUser = {
      id: newAccount.id,
      name: newAccount.name,
      email: newAccount.email,
      initials: this.makeInitials(newAccount.name),
    };
    this.setCurrentUser(authUser);
    return authUser;
  }

  // Send Mobile OTP
  async sendMobileOtp(
    countryCode: string,
    phone: string,
  ): Promise<{ success: boolean; demoOtp: string }> {
    const fullNumber = `${countryCode}${phone.replace(/\D/g, "")}`;
    const demoOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in localStorage for simulated verification
    const pending = {
      phone: fullNumber,
      otp: demoOtp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 min
    };
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_OTP, JSON.stringify(pending));
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signInWithOtp({
          phone: fullNumber,
        });
      } catch (e) {
        console.warn("Supabase SMS provider not active; using simulated OTP fallback.", e);
      }
    }

    return { success: true, demoOtp };
  }

  // Verify Mobile OTP
  async verifyMobileOtp(
    countryCode: string,
    phone: string,
    otp: string,
    name?: string,
  ): Promise<AuthUser> {
    const fullNumber = `${countryCode}${phone.replace(/\D/g, "")}`;

    // If Supabase configured, attempt OTP verification first
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          phone: fullNumber,
          token: otp.trim(),
          type: "sms",
        });

        if (!error && data?.user) {
          const authUser = this.mapSupabaseUser(data.user);
          this.setCurrentUser(authUser);
          return authUser;
        }
      } catch (e) {
        console.warn("Supabase OTP verification bypassed to simulated OTP check:", e);
      }
    }

    // Local / simulated verification
    await new Promise((r) => setTimeout(r, 400));
    const rawPending = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_OTP) : null;

    if (!rawPending) {
      throw new Error("No OTP request found. Please request a new code.");
    }

    const pending = JSON.parse(rawPending);
    if (pending.phone !== fullNumber) {
      throw new Error("Phone number mismatch. Please request a new OTP.");
    }

    if (Date.now() > pending.expiresAt) {
      throw new Error("OTP expired. Please request a new code.");
    }

    if (pending.otp !== otp.trim()) {
      throw new Error("Invalid OTP code. Please check and try again.");
    }

    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY_OTP);
    }

    // Find or create account
    const accounts = this.getAccounts();
    let account = accounts.find((a) => a.phone === fullNumber);

    if (!account) {
      const displayName = name?.trim() || `User ${phone.slice(-4)}`;
      account = {
        id: "usr_" + Math.random().toString(36).slice(2, 9),
        name: displayName,
        phone: fullNumber,
        createdAt: new Date().toISOString(),
      };
      this.saveAccounts([...accounts, account]);
    }

    const authUser: AuthUser = {
      id: account.id,
      name: account.name,
      email: account.email,
      phone: account.phone,
      avatarUrl: account.avatarUrl,
      initials: this.makeInitials(account.name),
    };
    this.setCurrentUser(authUser);
    return authUser;
  }

  async forgotPassword(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    if (isSupabaseConfigured()) {
      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/login`
          : "http://localhost:3000/login";
      const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
        redirectTo: redirectUrl,
      });
      if (error) {
        throw new Error(error.message || "Failed to send password recovery email.");
      }
      return;
    }

    await new Promise((r) => setTimeout(r, 500));
    console.log(`Password reset link sent to ${normalized}`);
  }

  async logout(): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error("Supabase signOut error:", e);
      }
    }
    await new Promise((r) => setTimeout(r, 150));
    this.setCurrentUser(null);
  }

  async updateUser(updates: Partial<AuthUser>): Promise<AuthUser> {
    const cur = this.getCurrentUser();
    if (!cur) throw new Error("No active session");

    const updated: AuthUser = {
      ...cur,
      ...updates,
      initials: updates.name ? this.makeInitials(updates.name) : cur.initials,
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.updateUser({
          data: {
            full_name: updated.name,
            name: updated.name,
            avatar_url: updated.avatarUrl,
          },
        });

        // Also update student_profiles table
        await supabase
          .from("student_profiles")
          .update({
            full_name: updated.name,
            avatar_url: updated.avatarUrl,
            phone: updated.phone,
          })
          .eq("id", cur.id);
      } catch (e) {
        console.error("Failed to update user profile in Supabase:", e);
      }
    }

    this.setCurrentUser(updated);

    // Update in stored accounts list
    const accounts = this.getAccounts();
    const idx = accounts.findIndex((a) => a.id === cur.id);
    if (idx !== -1) {
      accounts[idx] = {
        ...accounts[idx],
        ...updates,
      };
      this.saveAccounts(accounts);
    }

    return updated;
  }
}

export const authService = new AuthService();
