export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[--bg-primary]">
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-5xl font-semibold tracking-tight text-[--text-primary]">Flowmind</h1>
        <p className="max-w-md text-lg text-[--text-secondary]">
          A cognitive interface for capturing, connecting, and composing thought.
        </p>
        <div className="mt-4 flex gap-3">
          <span className="rounded-full bg-[--bg-secondary] px-4 py-2 text-sm text-[--text-secondary]">
            Coming soon
          </span>
        </div>
      </div>
    </main>
  );
}
