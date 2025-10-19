"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRegisterMutation, useUpdateFcmMutation } from "@/store/api";
import { saveToken } from "@/lib/auth";
import { initFcmAndGetToken } from "@/lib/firebase";
import {
  Button,
  Input,
  Tabs,
  Tab,
  Card,
  CardBody,
  Select,
  SelectItem,
  InputOtp,
} from "@heroui/react";
import { Mail, Phone } from "lucide-react";
import Link from "next/link";

function isValidE164(v: string) {
  return /^\+[1-9]\d{6,14}$/.test((v || "").trim());
}

// Parse RTK/fetch error shapes → { message, fieldErrors }
function parseApiError(err: any): { message?: string; fieldErrors: Record<string, string> } {
  // RTK Query rejected value: { status, data: { message, errors:[{path,message}] } }
  const status = err?.status ?? err?.originalStatus;
  const data = err?.data ?? err;
  const message = data?.message || err?.message;
  const list = Array.isArray(data?.errors) ? data.errors : [];
  const fieldErrors: Record<string, string> = {};
  for (const e of list) {
    const k = (e?.path ?? "").toString();
    const msg = (e?.message ?? "").toString();
    if (k) fieldErrors[k] = msg || "Invalid value";
  }
  // Fallback: if status 409 on email and no explicit field error, map it
  if (status === 409 && !fieldErrors.email && /email/i.test(message || "")) {
    fieldErrors.email = message || "email already exists";
  }
  return { message, fieldErrors };
}

export default function RegisterPage() {
  const router = useRouter();
  const [registerApi, { isLoading: isRegistering }] = useRegisterMutation();
  const [updateFcm] = useUpdateFcmMutation();

  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    age: 18,
    gender: "other",
    city: "",
  });
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function set<K extends keyof typeof form>(k: K, v: any) {
    const next = { ...form, [k]: v };
    setForm(next);
    // clear field-level error as user edits
    if (fieldErrors[k as string]) {
      const copy = { ...fieldErrors };
      delete copy[k as string];
      setFieldErrors(copy);
    }
  }

  // Email OTP states
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpBusy, setEmailOtpBusy] = useState(false);

  // Phone OTP form
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [profile, setProfile] = useState({ name: "", age: 18, gender: "male", city: "" });
  const [otpBusy, setOtpBusy] = useState(false);

  // Resend cooldowns
  const RESEND_SECONDS = 60;
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [emailResendBusy, setEmailResendBusy] = useState(false);
  const [phoneCooldown, setPhoneCooldown] = useState(0);
  const [phoneResendBusy, setPhoneResendBusy] = useState(false);

  useEffect(() => {
    if (emailCooldown <= 0) return;
    const t = setTimeout(() => setEmailCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [emailCooldown]);

  useEffect(() => {
    if (phoneCooldown <= 0) return;
    const t = setTimeout(() => setPhoneCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phoneCooldown]);

  function setCookieToken(token: string) {
    document.cookie = `token=${token}; Path=/; SameSite=Lax`;
  }

  async function onSubmitEmail(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError(null);
    setFieldErrors({});
    try {
      // Legacy direct register (kept for compatibility if you still support it)
      const data = await registerApi(form as any).unwrap();
      saveToken(data.token);
      setCookieToken(data.token);

      // best-effort FCM update
      try {
        const fcm = await initFcmAndGetToken();
        if (fcm) await updateFcm({ token: fcm });
      } catch {}

      router.push("/home");
    } catch (err: any) {
      const { message, fieldErrors } = parseApiError(err);
      setFieldErrors(fieldErrors || {});
      setGlobalError(message || "Register failed");
    }
  }

  async function sendPhoneOtp() {
    setGlobalError(null);
    setFieldErrors({});
    try {
      if (!isValidE164(phone)) {
        throw new Error("Enter a valid phone number in international format, e.g. +15551234567");
      }
      setOtpBusy(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/auth/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: phone,
          channel: "phone",
          purpose: "register",
          profile,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const { message, fieldErrors } = parseApiError({ status: res.status, data: json });
        setFieldErrors(fieldErrors || {});
        throw new Error(message || "Failed to send code");
      }
      setOtp("");
      setOtpSent(true);
      setPhoneCooldown(RESEND_SECONDS);
    } catch (e: any) {
      setGlobalError(e?.message || "Failed to send code");
    } finally {
      setOtpBusy(false);
    }
  }

  async function verifyPhoneOtp() {
    setGlobalError(null);
    setFieldErrors({});
    try {
      if (!/^\d{6}$/.test(otp)) throw new Error("Enter the 6-digit code");
      setOtpBusy(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: phone,
          channel: "phone",
          purpose: "register",
          code: otp,
          profile,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const { message, fieldErrors } = parseApiError({ status: res.status, data: json });
        setFieldErrors(fieldErrors || {});
        throw new Error(message || "Verification failed");
      }
      const token: string = json.token;
      saveToken(token);
      setCookieToken(token);

      // best-effort FCM update
      try {
        const fcm = await initFcmAndGetToken();
        if (fcm) {
          await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/users/me/fcm`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ token: fcm }),
          });
        }
      } catch {}

      router.push("/home");
    } catch (e: any) {
      setGlobalError(e?.message || "Invalid code");
    } finally {
      setOtpBusy(false);
    }
  }

  async function resendEmailOtp() {
    setGlobalError(null);
    setFieldErrors({});
    try {
      const v = (form.email || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        setFieldErrors({ email: "Enter a valid email" });
        return;
      }
      if (emailCooldown > 0) return;
      setEmailResendBusy(true);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/auth/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: v,
          channel: "email",
          purpose: "register",
          profile: {
            name: form.name,
            age: form.age,
            gender: form.gender,
            city: form.city,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const { message, fieldErrors } = parseApiError({ status: res.status, data: json });
        setFieldErrors(fieldErrors || {});
        throw new Error(message || "Failed to resend code");
      }
      setEmailCooldown(RESEND_SECONDS);
    } catch (e: any) {
      setGlobalError(e?.message || "Failed to resend code");
    } finally {
      setEmailResendBusy(false);
    }
  }

  async function resendPhoneOtp() {
    setGlobalError(null);
    setFieldErrors({});
    try {
      if (!isValidE164(phone)) {
        setFieldErrors({
          phone: "Enter a valid phone number in international format (e.g. +15551234567)",
        });
        return;
      }
      if (phoneCooldown > 0) return;
      setPhoneResendBusy(true);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/auth/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: phone,
          channel: "phone",
          purpose: "register",
          profile,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const { message, fieldErrors } = parseApiError({ status: res.status, data: json });
        setFieldErrors(fieldErrors || {});
        throw new Error(message || "Failed to resend code");
      }
      setPhoneCooldown(RESEND_SECONDS);
    } catch (e: any) {
      setGlobalError(e?.message || "Failed to resend code");
    } finally {
      setPhoneResendBusy(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-10 space-y-4">
      <h1 className="text-xl font-semibold">Create account</h1>
      <Card>
        <CardBody className="space-y-4">
          <Tabs
            fullWidth
            size="sm"
            onSelectionChange={() => {
              setGlobalError(null);
              setFieldErrors({});
            }}
          >
            <Tab
              key="email"
              title={
                <span className="flex items-center gap-2">
                  <Mail size={16} /> Email
                </span>
              }
            >
              <div className="space-y-3">
                {/* Email + Profile + Password */}
                <Input
                  isRequired
                  label="Email"
                  size="sm"
                  labelPlacement="outside-top"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  isInvalid={!!fieldErrors.email}
                  errorMessage={fieldErrors.email}
                  validate={(value) => {
                    const v = (value || "").trim();
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Enter a valid email";
                    return null;
                  }}
                />
                <Input
                  isRequired
                  label="Password"
                  type="password"
                  size="sm"
                  labelPlacement="outside-top"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  isInvalid={!!fieldErrors.password}
                  errorMessage={fieldErrors.password}
                  validate={(value) => {
                    if (!value || value.length < 8) return "Min 8 characters";
                    return null;
                  }}
                />
                <Input
                  label="Name"
                  size="sm"
                  labelPlacement="outside-top"
                  value={form.name}
                  isRequired
                  onChange={(e) => set("name", e.target.value)}
                  isInvalid={!!fieldErrors.name}
                  errorMessage={fieldErrors.name}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Age"
                    type="number"
                    size="sm"
                    labelPlacement="outside-top"
                    value={form.age.toString()}
                    isRequired
                    onChange={(e) => set("age", Number(e.target.value))}
                    isInvalid={!!fieldErrors.age}
                    errorMessage={fieldErrors.age}
                  />
                  <Input
                    label="City"
                    size="sm"
                    labelPlacement="outside-top"
                    value={form.city}
                    isRequired
                    onChange={(e) => set("city", e.target.value)}
                    isInvalid={!!fieldErrors.city}
                    errorMessage={fieldErrors.city}
                  />
                </div>
                <div className="mt-8">
                  <Select
                    label="Gender"
                    size="sm"
                    placeholder="Gender"
                    labelPlacement="outside"
                    selectedKeys={[form.gender]}
                    isRequired
                    onChange={(e) => set("gender", e.target.value)}
                    isInvalid={!!fieldErrors.gender}
                    errorMessage={fieldErrors.gender}
                  >
                    <SelectItem key="male">Male</SelectItem>
                    <SelectItem key="female">Female</SelectItem>
                    <SelectItem key="other">Other</SelectItem>
                  </Select>
                </div>

                {/* OTP step for Email */}
                {!emailOtpSent ? (
                  <>
                    {globalError && (
                      <div className="text-red-600 text-sm" role="alert">
                        {globalError}
                      </div>
                    )}
                    <Button
                      fullWidth
                      onPress={async () => {
                        setGlobalError(null);
                        setFieldErrors({});
                        try {
                          const v = (form.email || "").trim();
                          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
                            setFieldErrors({ email: "Enter a valid email" });
                            return;
                          }
                          setEmailOtpBusy(true);
                          const res = await fetch(
                            `${process.env.NEXT_PUBLIC_API_BASE}/auth/otp/request`,
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                target: v,
                                channel: "email",
                                purpose: "register",
                                profile: {
                                  name: form.name,
                                  age: form.age,
                                  gender: form.gender,
                                  city: form.city,
                                },
                              }),
                            },
                          );
                          const json = await res.json();
                          if (!res.ok) {
                            const { message, fieldErrors } = parseApiError({
                              status: res.status,
                              data: json,
                            });
                            setFieldErrors(fieldErrors || {});
                            throw new Error(message || "Failed to send code");
                          }
                          setEmailOtp("");
                          setEmailOtpSent(true);
                          setEmailCooldown(RESEND_SECONDS);
                        } catch (e: any) {
                          setGlobalError(e?.message || "Failed to send code");
                        } finally {
                          setEmailOtpBusy(false);
                        }
                      }}
                      isLoading={emailOtpBusy}
                    >
                      Send Code
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="space-y-2 flex flex-col items-center">
                      <label className="text-sm font-medium">
                        Enter the code sent to your email
                      </label>
                      <InputOtp
                        value={emailOtp}
                        onValueChange={setEmailOtp}
                        length={6}
                        isRequired
                        isInvalid={emailOtp.length === 6 && !/^\d{6}$/.test(emailOtp)}
                        errorMessage={
                          emailOtp.length === 6 && !/^\d{6}$/.test(emailOtp)
                            ? "Enter the 6-digit code"
                            : undefined
                        }
                      />
                    </div>

                    {globalError && (
                      <div className="text-red-600 text-sm" role="alert">
                        {globalError}
                      </div>
                    )}

                    <Button
                      color="primary"
                      fullWidth
                      isDisabled={emailOtp.length !== 6}
                      isLoading={emailOtpBusy}
                      onPress={async () => {
                        setGlobalError(null);
                        setFieldErrors({});
                        try {
                          if (!/^\d{6}$/.test(emailOtp)) {
                            setGlobalError("Enter the 6-digit code");
                            return;
                          }
                          setEmailOtpBusy(true);
                          // Use the OTP-verified register endpoint
                          const res = await fetch(
                            `${process.env.NEXT_PUBLIC_API_BASE}/auth/register`,
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                email: (form.email || "").trim(),
                                password: form.password,
                                code: emailOtp,

                                // SAME FIELDS AS /register:
                                phone: null, // or provide a captured phone if you have one here
                                name: form.name,
                                age: form.age,
                                gender: form.gender,
                                city: form.city || null,
                                profilePictureUrl: null, // pass actual value if available
                                fcmToken: null, // or prefetch/send here
                              }),
                            },
                          );
                          const json = await res.json();
                          if (!res.ok) {
                            const { message, fieldErrors } = parseApiError({
                              status: res.status,
                              data: json,
                            });
                            setFieldErrors(fieldErrors || {});
                            throw new Error(message || "Verification failed");
                          }

                          const token: string = json.token;

                          saveToken(token);
                          setCookieToken(token);

                          try {
                            const fcm = await initFcmAndGetToken();
                            if (fcm) await updateFcm({ token: fcm });
                          } catch {}

                          router.push("/home");
                        } catch (e: any) {
                          setGlobalError(e?.message || "Verification failed");
                        } finally {
                          setEmailOtpBusy(false);
                        }
                      }}
                    >
                      Verify & Create
                    </Button>

                    <div className="flex items-center justify-between text-xs">
                      <span className="opacity-70">
                        Didn’t get it?
                        {emailCooldown > 0 ? ` Resend in ${emailCooldown}s` : null}
                      </span>
                      <Button
                        size="sm"
                        variant="light"
                        onPress={resendEmailOtp}
                        isDisabled={emailCooldown > 0 || emailResendBusy}
                        isLoading={emailResendBusy}
                      >
                        Resend code
                      </Button>
                    </div>

                    <Button variant="flat" onPress={() => setEmailOtpSent(false)} fullWidth>
                      Change email
                    </Button>
                  </>
                )}
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
              {!otpSent ? (
                <div className="space-y-3">
                  <Input
                    isRequired
                    label="Phone"
                    labelPlacement="outside-top"
                    placeholder="+15551234567"
                    description="You must include country code."
                    size="sm"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    isInvalid={!!fieldErrors.phone}
                    errorMessage={fieldErrors.phone}
                    validate={(value) => {
                      const v = (value || "").trim();
                      if (!v.startsWith("+")) return "Include country code (starts with +)";
                      if (!/^\+[1-9]\d{6,14}$/.test(v)) return "Invalid phone format (7–15 digits)";
                      return null;
                    }}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Name"
                      size="sm"
                      labelPlacement="outside-top"
                      value={profile.name}
                      isRequired
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      isInvalid={!!fieldErrors.name}
                      errorMessage={fieldErrors.name}
                    />
                    <Input
                      label="City"
                      size="sm"
                      labelPlacement="outside-top"
                      value={profile.city}
                      isRequired
                      onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                      isInvalid={!!fieldErrors.city}
                      errorMessage={fieldErrors.city}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Age"
                      type="number"
                      size="sm"
                      labelPlacement="outside-top"
                      value={profile.age.toString()}
                      isRequired
                      onChange={(e) => setProfile({ ...profile, age: Number(e.target.value) })}
                      isInvalid={!!fieldErrors.age}
                      errorMessage={fieldErrors.age}
                    />
                    <Select
                      label="Gender"
                      size="sm"
                      placeholder="Gender"
                      labelPlacement="outside"
                      selectedKeys={[profile.gender]}
                      isRequired
                      onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                      isInvalid={!!fieldErrors.gender}
                      errorMessage={fieldErrors.gender}
                    >
                      <SelectItem key="male">Male</SelectItem>
                      <SelectItem key="female">Female</SelectItem>
                      <SelectItem key="other">Other</SelectItem>
                    </Select>
                  </div>

                  {globalError && (
                    <div className="text-red-600 text-sm" role="alert">
                      {globalError}
                    </div>
                  )}

                  <Button onPress={sendPhoneOtp} fullWidth isLoading={otpBusy}>
                    Send Code
                  </Button>
                  <div className="text-xs text-right mt-2">
                    <Link className="underline" href="/login">
                      Have an account? Sign in
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2 flex flex-col items-center">
                    <label className="text-sm font-medium">Verification code</label>
                    <InputOtp
                      value={otp}
                      onValueChange={setOtp}
                      length={6}
                      isRequired
                      isInvalid={otp.length === 6 && !/^\d{6}$/.test(otp)}
                      errorMessage={
                        otp.length === 6 && !/^\d{6}$/.test(otp)
                          ? "Enter the 6-digit code"
                          : undefined
                      }
                    />
                  </div>

                  {globalError && (
                    <div className="text-red-600 text-sm" role="alert">
                      {globalError}
                    </div>
                  )}

                  <Button
                    color="primary"
                    onPress={verifyPhoneOtp}
                    isDisabled={otp.length !== 6}
                    isLoading={otpBusy}
                    fullWidth
                  >
                    Verify & Create
                  </Button>

                  <div className="flex items-center justify-between text-xs">
                    <span className="opacity-70">
                      Didn’t get it?
                      {phoneCooldown > 0 ? ` Resend in ${phoneCooldown}s` : null}
                    </span>
                    <Button
                      size="sm"
                      variant="light"
                      onPress={resendPhoneOtp}
                      isDisabled={phoneCooldown > 0 || phoneResendBusy}
                      isLoading={phoneResendBusy}
                    >
                      Resend code
                    </Button>
                  </div>

                  <Button variant="flat" onPress={() => setOtpSent(false)} fullWidth>
                    Change phone
                  </Button>
                </div>
              )}
            </Tab>
          </Tabs>
        </CardBody>
      </Card>
    </div>
  );
}
