"use client";

import { FormEvent, useEffect, useState } from "react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ShieldCheck, UserRound, X } from "lucide-react";
import { BrandMark } from "./brand-mark";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  "https://nursery-tell-julie-transcription.trycloudflare.com/api"
).replace(/\/$/, "");

type AuthMode = "login" | "signup" | "otp";

export interface AuthUser {
  name: string;
  email: string;
}

interface AuthResponse {
  token?: string;
  accessToken?: string;
  message?: string;
  error?: string;
  user?: { name?: string; email?: string };
}

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (token: string, user: AuthUser) => void;
}

export function AuthModal({ open, onClose, onAuthenticated }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  if (!open) return null;

  const finishAuth = (result: AuthResponse, fallbackEmail: string, fallbackName?: string) => {
    const token = result.token ?? result.accessToken;
    if (!token) throw new Error("The authentication response did not include a JWT token.");

    onAuthenticated(token, {
      name: result.user?.name ?? fallbackName ?? fallbackEmail.split("@")[0] ?? "Echo user",
      email: result.user?.email ?? fallbackEmail,
    });
  };

  const request = async (path: string, payload: Record<string, string>) => {
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({ error: "The API returned an invalid response." })) as AuthResponse;
    if (!response.ok) throw new Error(result.error ?? result.message ?? `Authentication failed with status ${response.status}`);
    return result;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const result = await request("/auth/signup", { name: name.trim(), email: email.trim(), password });
        setMode("otp");
        setNotice(result.message ?? "We sent a 6-digit verification code to your email.");
      } else if (mode === "otp") {
        const result = await request("/auth/verify-otp", { email: email.trim(), otp: otp.trim() });
        finishAuth(result, email.trim(), name.trim());
      } else {
        const result = await request("/auth/login", { email: email.trim(), password });
        finishAuth(result, email.trim());
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const authenticateWithGoogle = async (idToken?: string) => {
    if (!idToken) return setError("Google did not return an ID token.");
    setLoading(true);
    setError("");
    try {
      const result = await request("/auth/google", { idToken });
      finishAuth(result, result.user?.email ?? "google-user@echo.ai", result.user?.name);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Google authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError("");
    setNotice("");
  };

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button className="auth-backdrop" onClick={onClose} aria-label="Close authentication" />
      <section className="auth-modal">
        <button className="auth-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="auth-brand"><BrandMark /></div>
        <div className="auth-heading">
          <span className="auth-icon">{mode === "otp" ? <ShieldCheck size={20} /> : <LockKeyhole size={20} />}</span>
          <h2 id="auth-title">{mode === "login" ? "Welcome back" : mode === "signup" ? "Create your account" : "Verify your email"}</h2>
          <p>{mode === "login" ? "Sign in to upload recordings and ask Echo." : mode === "signup" ? "One account for every conversation and insight." : `Enter the 6-digit code sent to ${email}.`}</p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === "signup" && (
            <label><span>Name</span><div><UserRound size={16} /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Morgan" autoComplete="name" required /></div></label>
          )}
          {mode !== "otp" && (
            <label><span>Email</span><div><Mail size={16} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></div></label>
          )}
          {mode !== "otp" && (
            <label><span>Password</span><div><LockKeyhole size={16} /><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></label>
          )}
          {mode === "otp" && (
            <label className="otp-field"><span>Verification code</span><input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} placeholder="000000" autoFocus required /></label>
          )}

          {notice && <div className="auth-notice success"><ShieldCheck size={14} />{notice}</div>}
          {error && <div className="auth-notice error">{error}</div>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? <LoaderCircle className="spin" size={17} /> : <>{mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Verify & continue"}<ArrowRight size={16} /></>}
          </button>
        </form>

        {mode !== "otp" && (
          <>
            <div className="auth-divider"><span>or continue with</span></div>
            <div className="google-auth">
              {googleClientId ? (
                <GoogleOAuthProvider clientId={googleClientId}>
                  <GoogleLogin onSuccess={(credential) => authenticateWithGoogle(credential.credential)} onError={() => setError("Google sign-in was cancelled or failed.")} width="340" shape="rectangular" />
                </GoogleOAuthProvider>
              ) : (
                <button className="google-fallback" onClick={() => setError("Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to .env.local, then restart the frontend.")}>
                  <span>G</span> Continue with Google
                </button>
              )}
            </div>
          </>
        )}

        <div className="auth-switch">
          {mode === "login" ? <>New to Echo? <button onClick={() => switchMode("signup")}>Create an account</button></> : mode === "signup" ? <>Already have an account? <button onClick={() => switchMode("login")}>Sign in</button></> : <button onClick={() => switchMode("signup")}>Use a different email</button>}
        </div>
      </section>
    </div>
  );
}
