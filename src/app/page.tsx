/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Initial landing shell verifying Phase 1 containerization and build pipeline.
 */

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-slate-100">
      <div className="max-w-lg rounded-xl border border-slate-800 bg-slate-900/70 p-8 text-center shadow-2xl backdrop-blur-md">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-500/25">
          PD
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          PulseDesk Helpdesk System
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Phase 1 Infrastructure, Docker Compose &amp; CI/CD Pipeline Initialized.
        </p>
      </div>
    </main>
  );
}
