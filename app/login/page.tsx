import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="eyebrow">Supabase Auth</div>
        <div className="hero-header">
          <div>
            <h1>Join the games</h1>
            <p>Use a magic link to sign in before entering scores or using admin tools.</p>
          </div>
          <Link href="/" className="secondary-link">
            Back to board
          </Link>
        </div>
      </section>

      <section className="card">
        <div className="section-heading">
          <h2>Sign In</h2>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
