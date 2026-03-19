import { redirect } from "next/navigation";
import { auth } from "~/lib/auth";
import Link from "next/link";

export default async function Home() {
  const session = await auth();
  
  if (session?.user) {
    redirect("/dashboard-app");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[--bg-primary]">
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-5xl font-semibold tracking-tight text-[--text-primary]">Flowmind</h1>
        <p className="max-w-md text-lg text-[--text-secondary]">
          A cognitive interface for capturing, connecting, and composing thought.
        </p>
        <div className="mt-4 flex gap-3">
          <Link
            href="/sign-in"
            className="rounded-lg bg-[--accent-primary] px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-600 transition-colors duration-150"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
