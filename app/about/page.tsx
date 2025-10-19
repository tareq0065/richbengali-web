"use client";

import pkg from "@/package.json";

export default function AboutPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>© {new Date().getFullYear()} RichBengali. All rights reserved.</div>
        <div>v{pkg.version}</div>
      </div>
    </div>
  );
}
