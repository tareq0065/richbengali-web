"use client";

import React, { ReactNode } from "react";
import { useGetMeQuery } from "@/store/api";
import { CallModal } from "@/components/call/CallModal";
import { MeetingProvider } from "@/components/MeetingProvider";

const CallProvider = ({ children }: { children: ReactNode }) => {
  const { data: meWrap, isLoading } = useGetMeQuery();
  const me = meWrap?.data;

  // Fancy shimmering logo loader
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="relative">
          {/* main logo with gentle breathing scale */}
          <div className="animate-breathe drop-shadow-[0_8px_24px_rgba(233,29,124,0.4)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 437.23 231.56"
              className="w-28 h-28"
            >
              <defs>
                <linearGradient
                  id="linear-gradient"
                  x1="509.78"
                  y1="94.52"
                  x2="407.83"
                  y2="106.03"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0" stopColor="#402e91" />
                  <stop offset="1" stopColor="#e91d7c" />
                </linearGradient>
                <linearGradient
                  id="linear-gradient-2"
                  x1="508.48"
                  y1="83.02"
                  x2="406.53"
                  y2="94.53"
                  xlinkHref="#linear-gradient"
                />
                <linearGradient
                  id="linear-gradient-3"
                  x1="213.8"
                  y1="122.13"
                  x2="279.8"
                  y2="204.01"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0" stopColor="#e51c79" />
                  <stop offset=".5" stopColor="#5c002a" />
                  <stop offset="1" stopColor="#e91d7c" />
                </linearGradient>
                <linearGradient
                  id="linear-gradient-4"
                  x1="236.13"
                  y1="47.54"
                  x2="160.28"
                  y2="83.96"
                  xlinkHref="#linear-gradient-3"
                />
                <linearGradient
                  id="linear-gradient-5"
                  x1="136.52"
                  y1="288.38"
                  x2="267.81"
                  y2="170.85"
                  xlinkHref="#linear-gradient"
                />
                <linearGradient
                  id="linear-gradient-6"
                  x1="57.51"
                  y1="200.12"
                  x2="188.8"
                  y2="82.59"
                  xlinkHref="#linear-gradient"
                />
              </defs>

              <g>
                <path
                  fill="url(#linear-gradient)"
                  d="M436.73,115.78c0,63.67-51.61,115.28-115.28,115.28-35.34,0-66.97-15.91-88.11-40.95-5.73-6.77-10.68-14.2-14.72-22.17-2.14-4.19-4.02-8.54-5.63-13.01l13.15-5.74,24.08-10.5c4.3,13.39,12.27,25.13,22.73,34.05,13.06,11.13,29.99,17.85,48.5,17.85,41.32,0,74.81-33.5,74.81-74.81s-33.49-74.81-74.81-74.81c-9.97,0-19.49,1.95-28.18,5.49l-.24.1c-.92.37-1.83.77-2.73,1.19l-66.12,28.7-13.01,5.64-24.24,10.52-50.98,22.13,11.9,28.11-36.87,15.63-11.76-27.8-28.04,12.17-16.11-36.97,28.43-12.35-12.32-29.11,36.86-15.64,12.18,28.78,43.74-19.01,39.78-17.29,69.06-30.01,5.75-2.5c13.26-5.32,27.74-8.25,42.9-8.25,63.67,0,115.28,51.61,115.28,115.28Z"
                />
                <path
                  fill="url(#linear-gradient-2)"
                  d="M250.22,138.69l-.02-.04-25.88-61.81c-.05-.13-.09-.26-.14-.39-1.6-4.41-3.46-8.69-5.56-12.83-4.06-7.99-9.03-15.45-14.78-22.23l-39.78,17.24c10.5,8.88,18.52,20.61,22.87,33.98.04.1.07.2.1.31l25.92,61.92.04.09c1.61,4.47,3.49,8.82,5.63,13.01,4.04,7.97,8.99,15.4,14.72,22.17l39.61-17.37c-10.46-8.92-18.43-20.66-22.73-34.05Z"
                />
              </g>

              <path
                fill="url(#linear-gradient-3)"
                d="M293.75,185.29h0s-15.32,37.47-15.32,37.47c-17.6-7.08-33.05-18.39-45.09-32.65-5.73-6.77-10.68-14.2-14.72-22.17-2.14-4.19-4.02-8.54-5.63-13.01l-.04-.09-13.19-31.51,37.23-16.22,13.2,31.5v.04s.03.04.03.04c4.3,13.39,12.27,25.13,22.73,34.05,6.15,5.24,13.17,9.51,20.8,12.55Z"
              />
              <polygon
                fill="url(#linear-gradient-4)"
                points="248.91 65.72 224.18 76.45 186.93 92.61 163.76 102.67 147.01 66.02 164.06 58.63 203.84 41.39 230.1 30.01 248.91 65.72"
              />
              <g>
                <polygon
                  fill="url(#linear-gradient-5)"
                  points="358.15 111.54 331.19 178.14 303.72 115.36 290.93 86.14 358.15 111.54"
                />
                <path
                  fill="url(#linear-gradient-6)"
                  d="M319.83,152.2s-46.88,20.54-46.88,20.54l-39.61,17.37-68.44,29.99c-14.9,7.03-31.55,10.96-49.12,10.96C52.12,231.06.5,179.45.5,115.78S52.12.5,115.78.5c35.32,0,66.93,15.88,88.06,40.89,5.75,6.78,10.72,14.24,14.78,22.23,2.1,4.14,3.96,8.42,5.56,12.83l-13.01,5.64-24.24,10.52c-4.35-13.37-12.37-25.1-22.87-33.98-13.03-11.02-29.88-17.66-48.28-17.66-41.31,0-74.8,33.5-74.8,74.81s33.49,74.81,74.8,74.81c9.45,0,18.49-1.75,26.81-4.96,2.12-.8,4.18-1.7,6.19-2.7l64.21-28,13.15-5.74,24.08-10.5-.02-.04.02.04,53.5-23.33"
                />
              </g>
            </svg>
          </div>
        </div>
      </div>
    );
  }

  // not logged in / no profile → don't init call layer
  if (!me) {
    return <>{children}</>;
  }

  // normal provider case
  return (
    <MeetingProvider
      self={{
        id: me.id,
        name: me.name,
        username: me.name?.toLowerCase(),
        location: me.city || undefined,
        avatarUrl: me.profile_picture_url || undefined,
      }}
      apiBase={process.env.NEXT_PUBLIC_API_BASE}
      maxCallDurationSec={600}
      events={{
        onIncomingCall: (room, from) => console.log("📞 incoming", room, from),
        onCallStart: (room, peer) => console.log("✅ Call started", room, peer),
        onBusy: (room, by) => console.log("🚫 Busy:", room, by),
        onCallEnd: (room) => console.log("❌ Call ended", room),
      }}
    >
      <CallModal />
      {children}
    </MeetingProvider>
  );
};

export default CallProvider;
