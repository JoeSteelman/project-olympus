"use client";

import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Sending magic link...");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo:
            typeof window === "undefined"
              ? undefined
              : `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Magic link sent.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to start sign in."
      );
    }
  }

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <label>
        <span>Email</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="captain@olympus.com"
          required
        />
      </label>
      <button type="submit" className="primary-button full-span">
        Send magic link
      </button>
      <span className="mini-note">{message}</span>
    </form>
  );
}
