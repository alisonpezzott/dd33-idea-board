import type { ReactNode } from 'react';
import { AlertCircle, Lightbulb, RotateCw } from 'lucide-react';

export function LoadingState() {
  return <div role="status" aria-label="Loading ideas" className="grid gap-500 sm:grid-cols-2">
    {[0, 1, 2, 3].map((key) => <div key={key} className="min-h-card motion-safe:animate-pulse rounded-3xl border bg-card p-600">
      <div className="mb-600 h-600 w-1/3 rounded-full bg-muted" />
      <div className="mb-300 h-600 w-3/4 rounded-md bg-muted" />
      <div className="mb-200 h-400 w-full rounded-md bg-muted" />
      <div className="h-400 w-2/3 rounded-md bg-muted" />
    </div>)}
  </div>;
}

export function EmptyState({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) {
  return <div className="flex min-h-card flex-col items-center justify-center gap-400 rounded-3xl border border-dashed bg-card p-800 text-center">
    <span className="rounded-2xl bg-accent p-400 text-accent-foreground"><Lightbulb className="icon-size-500" /></span>
    <div><h3 className="font-heading text-500 font-semibold">{title}</h3><p className="mt-200 text-300 text-muted-foreground">{hint}</p></div>
    {action}
  </div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div role="alert" className="flex items-start gap-300 rounded-2xl border border-destructive/25 bg-destructive/5 p-400 text-300">
    <AlertCircle className="icon-size-300 shrink-0 text-destructive" />
    <p className="flex-1">{message}</p>
    {onRetry && <button type="button" onClick={onRetry} className="flex shrink-0 items-center gap-200 font-semibold underline underline-offset-4"><RotateCw className="icon-size-200" />Retry</button>}
  </div>;
}
