"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

export default function SignIn() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";


  return (
    <main className="min-h-screen bg-background py-12 px-4 flex justify-center items-center">
      <div className="w-full max-w-lg receipt-paper jagged-top jagged-bottom p-8 flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-bold uppercase tracking-[0.2em] text-center">
            Tab Slash
          </h1>
          <div className="dotted-line"></div>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 w-full">
              <div className="flex-1 border-t border-ink/20 border-dashed"></div>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-center whitespace-nowrap opacity-70">
                {flow === "signIn" ? "Authentication" : "Registration"}
              </h2>
              <div className="flex-1 border-t border-ink/20 border-dashed"></div>
            </div>
            <p className="text-[10px] uppercase opacity-60 leading-relaxed italic text-center">
              Access the digital ledger to manage your receipts
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => void signIn("google", { redirectTo })}
              className="flex items-center justify-center gap-3 border-2 border-ink py-3 text-xs font-bold uppercase tracking-[0.1em] hover:bg-ink hover:text-paper transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor"/>
              </svg>
              Sign in with Google
            </button>

            <div className="dotted-line my-2"></div>

            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                setLoading(true);
                setError(null);
                const formData = new FormData(e.target as HTMLFormElement);
                formData.set("flow", flow);
                void signIn("password", formData)
                  .then(() => {
                    router.push(redirectTo);
                  })
                  .catch((error) => {
                    setError(error.message);
                    setLoading(false);
                  });
              }}
            >
              <div className="flex flex-col gap-3">
                <input
                  className="bg-paper border border-ink/20 p-3 text-base uppercase tracking-widest placeholder:opacity-30 focus:border-ink outline-none transition-all"
                  type="email"
                  name="email"
                  placeholder="[ Email Address ]"
                  required
                />
                <input
                  className="bg-paper border border-ink/20 p-3 text-base uppercase tracking-widest placeholder:opacity-30 focus:border-ink outline-none transition-all"
                  type="password"
                  name="password"
                  placeholder="[ Password ]"
                  minLength={8}
                  required
                />
              </div>

              {error && (
                <p className="text-red-600 text-[10px] uppercase font-bold text-center border border-red-600/20 p-2 italic">
                  Error: {error}
                </p>
              )}

              <button
                className="bg-ink text-paper py-3 text-xs font-bold uppercase tracking-[0.2em] hover:opacity-90 transition-all disabled:opacity-50"
                type="submit"
                disabled={loading}
              >
                {loading ? ">>> Processing <<<" : flow === "signIn" ? ">> Sign In <<" : ">> Sign Up <<"}
              </button>

              <div className="flex flex-col items-center gap-2">
                <p className="text-[10px] uppercase opacity-60">
                  {flow === "signIn"
                    ? "New user detected?"
                    : "Existing account found?"}
                </p>
                <button
                  type="button"
                  className="text-xs font-bold uppercase underline hover:opacity-70 transition-opacity cursor-pointer whitespace-nowrap"
                  onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
                >
                  {flow === "signIn" ? "[ Create Account ]" : "[ Sign In Instead ]"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="dotted-line mt-auto"></div>
        <div className="flex justify-center items-center">
          <p className="text-[10px] uppercase tracking-[0.3em] opacity-40 italic">
            *** Authorization Terminal ***
          </p>
        </div>
      </div>
    </main>
  );
}
