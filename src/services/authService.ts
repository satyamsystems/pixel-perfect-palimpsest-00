/**
 * AuthService for Trajectify.AI
 *
 * Provides authentication state, session persistence, mock email/password auth,
 * and simulated mobile OTP verification.
 *
 * TODO [Backend Integration - PHP & MySQL]:
 * 1. Replace localStorage with HTTP calls to PHP endpoints:
 *    - POST /api/auth/login.php
 *    - POST /api/auth/signup.php
 *    - POST /api/auth/send-otp.php (wire into SMS Gateway like Twilio/MSG91/AWS SNS)
 *    - POST /api/auth/verify-otp.php
 *    - POST /api/auth/logout.php
 *    - GET  /api/auth/me.php
 * 2. Secure sessions using HTTP-only JWT cookies or PHP session cookies with CSRF tokens.
 * 3. Hash passwords with password_hash(..., PASSWORD_BCRYPT) on the PHP backend.
 *
 * NOTE: The current client-side implementation is a mock for local prototyping.
 * It does NOT claim to provide cryptographic security.
 */

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

class LocalAuthService {
  private listeners: Set<(user: AuthUser | null) => void> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      // Listen to cross-tab storage changes
      window.addEventListener("storage", (e) => {
        if (e.key === STORAGE_KEY_SESSION) {
          const user = this.getCurrentUser();
          this.notify(user);
        }
      });
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
    if (typeof window === "undefined") return null;
    try {
      const data = localStorage.getItem(STORAGE_KEY_SESSION);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
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
    await new Promise((r) => setTimeout(r, 400));
    const normalized = email.trim().toLowerCase();
    const accounts = this.getAccounts();
    const account = accounts.find((a) => a.email?.toLowerCase() === normalized);

    if (!account) {
      // Auto-create account in prototype mode if not found, or validate
      // In this prototype, if it's a first time email, create user seamlessly
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
    await new Promise((r) => setTimeout(r, 450));
    const normalized = email.trim().toLowerCase();
    const accounts = this.getAccounts();

    if (accounts.some((a) => a.email?.toLowerCase() === normalized)) {
      throw new Error("An account with this email already exists. Please log in.");
    }

    const newAccount: StoredAccount = {
      id: "usr_" + Math.random().toString(36).slice(2, 9),
      name: name.trim(),
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
  // TODO [Backend]: Wire into PHP API -> Twilio / SMS Gateway
  async sendMobileOtp(
    countryCode: string,
    phone: string,
  ): Promise<{ success: boolean; demoOtp: string }> {
    await new Promise((r) => setTimeout(r, 350));
    const fullNumber = `${countryCode}${phone.replace(/\D/g, "")}`;
    // Generate deterministic or pseudo-random 6 digit OTP
    const demoOtp = Math.floor(100000 + Math.random() * 900000).toString();

    const pending = {
      phone: fullNumber,
      otp: demoOtp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 min
    };
    localStorage.setItem(STORAGE_KEY_OTP, JSON.stringify(pending));

    return { success: true, demoOtp };
  }

  // Verify Mobile OTP
  // TODO [Backend]: Validate hash in MySQL
  async verifyMobileOtp(
    countryCode: string,
    phone: string,
    otp: string,
    name?: string,
  ): Promise<AuthUser> {
    await new Promise((r) => setTimeout(r, 400));
    const fullNumber = `${countryCode}${phone.replace(/\D/g, "")}`;
    const rawPending = localStorage.getItem(STORAGE_KEY_OTP);

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

    localStorage.removeItem(STORAGE_KEY_OTP);

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
    await new Promise((r) => setTimeout(r, 500));
    // Simulated password reset email
    console.log(`Password reset link sent to ${email}`);
  }

  async logout(): Promise<void> {
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

export const authService = new LocalAuthService();
