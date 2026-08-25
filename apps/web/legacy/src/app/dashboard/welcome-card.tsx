"use client";

type User = { name?: string | null; email: string };

export function WelcomeCard({ user }: { user: User }) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="text-lg font-semibold">Welcome back</h2>
      <p className="text-muted-foreground">
        {user.name ? `${user.name}, ` : ""}you&apos;re logged in to Brnit.
      </p>
    </div>
  );
}
