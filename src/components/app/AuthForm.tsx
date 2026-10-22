import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import { dataService } from "@/services/dataService";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AuthFormProps {
  mode: "login" | "signup";
}

const COUNTRY_CODES = [
  { code: "+91", label: "India (+91)" },
  { code: "+1", label: "US / Canada (+1)" },
  { code: "+44", label: "UK (+44)" },
  { code: "+61", label: "Australia (+61)" },
  { code: "+65", label: "Singapore (+65)" },
  { code: "+971", label: "UAE (+971)" },
  { code: "+49", label: "Germany (+49)" },
];

export function AuthForm({ mode }: AuthFormProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"email" | "mobile">("email");

  // Email form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Mobile form state
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Loading and modals
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((t) => (t > 0 ? t - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      toast.error("Please enter your name.");
      return;
    }

    try {
      setLoading(true);
      let user;
      if (mode === "signup") {
        user = await authService.signupWithEmail(name, email, password);
        toast.success("Account created successfully!", {
          description: "Welcome to Trajectify.AI. Let's set up your personal trajectory.",
        });
      } else {
        user = await authService.loginWithEmail(email, password, rememberMe);
        toast.success(`Welcome back, ${user.name.split(" ")[0]}!`);
      }

      // Check if profile exists
      const profile = await dataService.getProfile(user.id);
      if (!profile) {
        navigate({ to: "/onboarding" });
      } else {
        navigate({ to: "/dashboard" });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp() {
    const cleanNumber = phone.replace(/\D/g, "");
    if (cleanNumber.length < 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }

    try {
      setLoading(true);
      const res = await authService.sendMobileOtp(countryCode, cleanNumber);
      setOtpSent(true);
      setResendTimer(30);

      // Explicitly show simulated Demo OTP in a branded toast
      toast.info("Demo OTP Generated", {
        description: (
          <div className="font-mono text-sm font-bold text-foreground">
            Code: <span className="text-primary text-base underline">{res.demoOtp}</span> (Simulated
            SMS OTP)
          </div>
        ),
        duration: 10000,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to dispatch OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Please enter the complete 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);
      const user = await authService.verifyMobileOtp(countryCode, phone, otp, name);
      toast.success(`Mobile verified! Welcome, ${user.name}.`);

      const profile = await dataService.getProfile(user.id);
      if (!profile) {
        navigate({ to: "/onboarding" });
      } else {
        navigate({ to: "/dashboard" });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error("Please enter your registered email address.");
      return;
    }
    await authService.forgotPassword(forgotEmail);
    toast.success("Password recovery link sent", {
      description: "If an account exists with that email, check your inbox for instructions.",
    });
    setForgotOpen(false);
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-6">
        <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "login"
            ? "Simulate your future. Log in to track your trajectory."
            : "Join Trajectify.AI and start engineering your future today."}
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as "email" | "mobile");
          setOtpSent(false);
          setOtp("");
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted p-1 mb-6">
          <TabsTrigger value="email" className="rounded-lg text-sm font-semibold py-2">
            Email
          </TabsTrigger>
          <TabsTrigger value="mobile" className="rounded-lg text-sm font-semibold py-2">
            Mobile number
          </TabsTrigger>
        </TabsList>

        {/* EMAIL TAB */}
        <TabsContent value="email">
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-xs font-semibold text-foreground" htmlFor="auth-name">
                  Full Name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="mt-1.5 w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-foreground" htmlFor="auth-email">
                Email Address
              </label>
              <div className="relative mt-1.5">
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full rounded-xl border border-input bg-card pl-10 pr-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground" htmlFor="auth-password">
                  Password
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setForgotOpen(true);
                    }}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative mt-1.5">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-input bg-card pl-10 pr-10 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(c) => setRememberMe(Boolean(c))}
                />
                <label
                  htmlFor="remember"
                  className="text-xs font-medium text-muted-foreground cursor-pointer select-none"
                >
                  Remember me on this browser
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                "Processing..."
              ) : mode === "login" ? (
                <>
                  Log in to Trajectify <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Create Account <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </TabsContent>

        {/* MOBILE OTP TAB */}
        <TabsContent value="mobile">
          {!otpSent ? (
            <div className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="text-xs font-semibold text-foreground" htmlFor="auth-m-name">
                    Full Name
                  </label>
                  <input
                    id="auth-m-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Patil"
                    className="mt-1.5 w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-foreground" htmlFor="auth-phone">
                  Mobile Number
                </label>
                <div className="mt-1.5 flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-32 rounded-xl border border-input bg-card px-2.5 py-2.5 text-sm outline-none focus:border-primary cursor-pointer"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <div className="relative flex-1">
                    <input
                      id="auth-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="98765 43210"
                      maxLength={14}
                      className="w-full rounded-xl border border-input bg-card pl-10 pr-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  We'll send a 6-digit verification code to this number.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading || phone.replace(/\D/g, "").length < 10}
                className="w-full rounded-xl bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  "Generating OTP..."
                ) : (
                  <>
                    Send OTP <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="rounded-xl bg-muted/60 p-3.5 text-xs text-muted-foreground flex items-center justify-between">
                <span>
                  Code sent to{" "}
                  <strong className="text-foreground">
                    {countryCode} {phone}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="font-semibold text-primary hover:underline"
                >
                  Edit
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-2 text-center">
                  Enter 6-digit Verification OTP
                </label>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={(val) => setOtp(val)}>
                    <InputOTPGroup className="gap-2">
                      <InputOTPSlot
                        index={0}
                        className="rounded-lg h-11 w-11 text-base border-input"
                      />
                      <InputOTPSlot
                        index={1}
                        className="rounded-lg h-11 w-11 text-base border-input"
                      />
                      <InputOTPSlot
                        index={2}
                        className="rounded-lg h-11 w-11 text-base border-input"
                      />
                      <InputOTPSlot
                        index={3}
                        className="rounded-lg h-11 w-11 text-base border-input"
                      />
                      <InputOTPSlot
                        index={4}
                        className="rounded-lg h-11 w-11 text-base border-input"
                      />
                      <InputOTPSlot
                        index={5}
                        className="rounded-lg h-11 w-11 text-base border-input"
                      />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-muted-foreground">Didn't receive code?</span>
                <button
                  type="button"
                  disabled={resendTimer > 0 || loading}
                  onClick={handleSendOtp}
                  className="font-semibold text-primary disabled:text-muted-foreground hover:underline"
                >
                  {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full rounded-xl bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? "Verifying..." : "Verify & Continue"}
              </button>
            </form>
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-8 border-t pt-6 text-center text-xs text-muted-foreground">
        {mode === "login" ? (
          <p>
            Don't have an account yet?{" "}
            <Link to="/signup" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </p>
        ) : (
          <p>
            Already have a Trajectify account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          </p>
        )}
      </div>

      {/* Forgot Password Modal */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Reset your password</DialogTitle>
            <DialogDescription className="text-xs">
              Enter your email address to receive password recovery instructions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4 pt-2">
            <div>
              <label htmlFor="f-email" className="text-xs font-semibold">
                Email
              </label>
              <input
                id="f-email"
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="you@domain.com"
                className="mt-1.5 w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <DialogFooter>
              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-primary py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Send reset link
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
