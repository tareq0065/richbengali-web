"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLoginMutation, useUpdateFcmMutation } from "@/store/api";
import { saveToken } from "@/lib/auth";
import { initFcmAndGetToken } from "@/lib/firebase";
import { Button, Input, Tabs, Tab, Card, CardBody, InputOtp } from "@heroui/react";
import { Mail, Phone } from "lucide-react";
import { store } from "@/store";

function isValidE164(v: string) {
  return /^\+[1-9]\d{6,14}$/.test((v || "").trim());
}

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const nextDest = search.get("next") || "/home";

  const [login] = useLoginMutation();
  const [updateFcm] = useUpdateFcmMutation();
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLogging] = useState<boolean>(false);

  // Email form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Phone OTP form
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  function setCookieToken(token: string) {
    document.cookie = `token=${token}; Path=/; SameSite=Lax`;
  }

  function hardRedirect(to: string) {
    window.location.replace(to); // no back to register
  }

  useEffect(() => {
    (async () => {
      const fcm = await initFcmAndGetToken();
      setFcmToken(fcm);
    })();
  }, []);

  // --- Email login via your Next API (kept as-is) ---
  async function onSubmitEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLogging(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, next: nextDest }),
      });

      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.message || "Login failed");
      }

      let token: string | undefined;
      try {
        const j = await r.json();
        token = j?.token;
      } catch {}

      if (token) {
        saveToken(token);
        setCookieToken(token);
      }

      if (fcmToken) {
        try {
          await updateFcm({ token: fcmToken });
        } catch {}
        hardRedirect("/home");
      }

      hardRedirect("/home");

      setLogging(false);
    } catch (e: any) {
      setError(e?.message || "Login failed");
      setLogging(false);
    }
  }

  // --- Phone login using DB-backed OTP (no Firebase) ---
  async function sendPhoneOtp() {
    setError(null);
    setLogging(true);
    try {
      if (!isValidE164(phone)) {
        throw new Error("Enter a valid phone number in international format, e.g. +15551234567");
      }
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/auth/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: phone,
          channel: "phone",
          purpose: "login",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to send code");
      setOtp("");
      setOtpSent(true);
      setLogging(false);
    } catch (e: any) {
      setError(e?.message || "Failed to send code");
      setLogging(false);
    }
  }

  async function verifyPhoneOtp() {
    setError(null);
    try {
      if (!/^\d{6}$/.test(otp)) throw new Error("Enter the 6-digit code");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: phone,
          channel: "phone",
          purpose: "login",
          code: otp,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Verification failed");

      const token: string = json.token;
      saveToken(token);
      setCookieToken(token);

      const fcm = await initFcmAndGetToken();
      if (fcm) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/users/me/fcm`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ token: fcm }),
          });
        } catch {}
      }

      router.replace(nextDest);
    } catch (e: any) {
      setError(e?.message || "Invalid code");
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-10 space-y-4">
      <h1 className="text-xl font-semibold">Welcome back</h1>
      <Card>
        <CardBody className="space-y-4">
          <Tabs fullWidth size="sm" aria-label="login methods">
            <Tab
              key="email"
              title={
                <span className="flex items-center gap-2">
                  <Mail size={16} /> Email
                </span>
              }
            >
              <form className="space-y-3" onSubmit={onSubmitEmail}>
                <Input
                  label="Email"
                  size="sm"
                  labelPlacement="outside-top"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  validate={(value) => {
                    const v = (value || "").trim();
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Enter a valid email";
                    return null;
                  }}
                  isRequired
                />
                <Input
                  label="Password"
                  size="sm"
                  labelPlacement="outside-top"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  validate={(value) =>
                    !value ? "Required" : value.length < 6 ? "Min 6 characters" : null
                  }
                  isRequired
                />
                {error && <div className="text-red-600 text-sm">{error}</div>}
                <Button
                  color="primary"
                  type="submit"
                  fullWidth
                  isLoading={loading}
                  disabled={loading}
                >
                  Sign in
                </Button>
              </form>
              <div className="flex justify-between text-xs text-gray-600 mt-3">
                <Link href="/register" className="underline">
                  Create account
                </Link>
                <Link href="/forgot" className="underline">
                  Forgot password?
                </Link>
              </div>
            </Tab>

            <Tab
              key="phone"
              title={
                <span className="flex items-center gap-2">
                  <Phone size={16} /> Phone
                </span>
              }
            >
              <div className="space-y-3">
                {!otpSent ? (
                  <>
                    <Input
                      label="Phone"
                      labelPlacement="outside"
                      placeholder="+15551234567"
                      description="You must include country code."
                      size="sm"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      validate={(value) => {
                        const v = (value || "").trim();
                        if (!v.startsWith("+")) return "Include country code (starts with +)";
                        if (!/^\+[1-9]\d{6,14}$/.test(v))
                          return "Invalid phone format (7–15 digits)";
                        return null;
                      }}
                      isRequired
                    />
                    {error && <div className="text-red-600 text-sm">{error}</div>}
                    <Button onPress={sendPhoneOtp} fullWidth isLoading={loading} disabled={loading}>
                      Send Code
                    </Button>
                    <div className="flex justify-between text-xs text-gray-600 mt-3">
                      <Link href="/register" className="underline">
                        Create account
                      </Link>
                      <Link href="/forgot" className="underline">
                        Forgot password?
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2 flex flex-col items-center">
                      <label className="text-sm font-medium">Verification code</label>
                      <InputOtp
                        value={otp}
                        onValueChange={setOtp}
                        length={6}
                        isInvalid={otp.length === 6 && !/^\d{6}$/.test(otp)}
                      />
                      {otp.length === 6 && !/^\d{6}$/.test(otp) && (
                        <div className="text-red-600 text-xs">Enter the 6-digit code</div>
                      )}
                    </div>
                    {error && <div className="text-red-600 text-sm">{error}</div>}
                    <Button
                      onPress={verifyPhoneOtp}
                      color="primary"
                      isDisabled={otp.length !== 6}
                      fullWidth
                    >
                      Verify &amp; Sign in
                    </Button>
                    <Button variant="flat" onPress={() => setOtpSent(false)} fullWidth>
                      Change phone
                    </Button>
                  </>
                )}
              </div>
            </Tab>
          </Tabs>
        </CardBody>
      </Card>
    </div>
  );
}
