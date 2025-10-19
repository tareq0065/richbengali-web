"use client";
import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { addToast, Button, Card, CardBody, Input } from "@heroui/react";
import { Mail } from "lucide-react";

export default function ForgotPage() {
  const search = useSearchParams();
  const token = search.get("token");

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const passwordError = useMemo(() => {
    if (!password) return null;
    if (password.length < 8) return "Password must be at least 8 characters";
    return null;
  }, [password]);

  const confirmError = useMemo(() => {
    if (!confirm) return null;
    if (confirm !== password) return "Passwords do not match";
    return null;
  }, [confirm, password]);

  function hardRedirect(to: string) {
    window.location.replace(to); // no back to register
  }

  async function submitForgot(e: React.FormEvent) {
    e.preventDefault();
    setStatus(undefined);
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/auth/password/forgot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        addToast({
          title: "Error",
          color: "danger",
          description: "Request failed",
        });
        throw new Error("Request failed");
      }
      addToast({
        title: "Info",
        color: "warning",
        description: "If an account exists for that email, a reset link has been sent.",
      });
      setStatus("If an account exists for that email, a reset link has been sent.");
    } catch {
      addToast({
        title: "Info",
        color: "warning",
        description: "If an account exists for that email, a reset link has been sent.",
      });
      setStatus("If an account exists for that email, a reset link has been sent.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    setStatus(undefined);
    if (!token) return;
    if (passwordError || confirmError) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/auth/password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast({
          title: "Error",
          color: "danger",
          description: json?.message || "Reset failed",
        });
        throw new Error(json?.message || "Reset failed");
      }
      setStatus("Password updated. You can sign in now.");
      addToast({
        title: "Success",
        color: "success",
        description:
          "Password updated. You can sign in now. You will redirect to the login page in 3 seconds.",
      });
      // Optional: redirect after a short delay
      setTimeout(() => hardRedirect("/login"), 3000);
    } catch (err: any) {
      addToast({
        title: "Error",
        color: "danger",
        description: err?.message || "Reset failed. The link may be expired.",
      });
      setStatus(err?.message || "Reset failed. The link may be expired.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-10 space-y-4">
      <h1 className="text-xl font-semibold">{token ? "Set a new password" : "Forgot password"}</h1>
      <Card>
        <CardBody>
          {!token ? (
            <form className="space-y-3" onSubmit={submitForgot}>
              <Input
                label="Email"
                size="sm"
                value={email}
                labelPlacement="outside-top"
                onChange={(e) => setEmail(e.target.value)}
                startContent={<Mail size={16} />}
                isRequired
                validate={(value) => {
                  const v = (value || "").trim();
                  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "Enter a valid email";
                }}
              />
              <Button color="primary" type="submit" fullWidth isLoading={submitting}>
                Send reset link
              </Button>
              <div className="text-xs text-right mt-2">
                <Link className="underline" href="/login">
                  Back to sign in
                </Link>
              </div>
            </form>
          ) : (
            <form className="space-y-3" onSubmit={submitReset}>
              <Input
                label="New password"
                type="password"
                size="sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                isRequired
                validate={() => passwordError}
              />
              <Input
                label="Confirm new password"
                type="password"
                size="sm"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                isRequired
                validate={() => confirmError}
              />
              <Button
                color="primary"
                type="submit"
                fullWidth
                isDisabled={Boolean(passwordError || confirmError || !password || !confirm)}
                isLoading={submitting}
              >
                Update password
              </Button>
              <div className="text-xs text-right mt-2">
                <Link className="underline" href="/login">
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
          {status && <div className="text-xs text-red-500 mt-3">{status}</div>}
        </CardBody>
      </Card>
    </div>
  );
}
