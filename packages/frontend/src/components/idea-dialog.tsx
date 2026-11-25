import { useState, type FormEvent, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowUpRight, Lightbulb, X } from 'lucide-react';
import { categories, type IdeaRecord } from '@rayfin-app/shared';
import type { IdeaInput } from '@/services/idea-board.service';

const fieldClass = 'w-full rounded-xl border border-input bg-background px-400 py-300 text-300 placeholder:text-muted-foreground';

export function BoardDialog({ open, onOpenChange, title, description, children }: {
  open: boolean; onOpenChange(open: boolean): void; title: string; description: string; children: ReactNode;
}) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay backdrop-blur-sm" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-var(--spacing-800))] max-w-dialog -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-4xl border bg-popover p-600 text-popover-foreground shadow-float sm:p-800">
        <div className="mb-500 flex items-start justify-between gap-400">
          <span className="rounded-2xl bg-accent p-300 text-accent-foreground"><Lightbulb className="icon-size-400" /></span>
          <Dialog.Close aria-label="Close dialog" className="rounded-full p-200 text-muted-foreground hover:bg-muted"><X className="icon-size-300" /></Dialog.Close>
        </div>
        <Dialog.Title className="font-heading text-hero-700 font-semibold leading-hero-700">{title}</Dialog.Title>
        <Dialog.Description className="mt-200 text-300 leading-300 text-muted-foreground">{description}</Dialog.Description>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

export function IdeaForm({ idea, author, pending, error, onSave }: {
  idea?: IdeaRecord; author: string; pending: boolean; error: ReactNode;
  onSave(input: IdeaInput, author: string): Promise<void>;
}) {
  const [title, setTitle] = useState(idea?.title ?? '');
  const [description, setDescription] = useState(idea?.description ?? '');
  const [category, setCategory] = useState(idea?.category ?? 'Product');
  const [name, setName] = useState(idea?.author ?? author);
  const canSave = title.trim() && description.trim() && name.trim();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSave || pending) return;
    void onSave({ title: title.trim(), description: description.trim(), category }, name.trim());
  }

  return <form onSubmit={submit} className="mt-600 space-y-500">
    <div><label htmlFor="idea-title" className="mb-200 block text-300 font-semibold">Give it a great title</label>
      <input id="idea-title" required autoFocus maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What if we..." className={fieldClass} />
      <p className="mt-100 text-right text-200 text-muted-foreground">{title.length}/120</p>
    </div>
    <div><label htmlFor="idea-description" className="mb-200 block text-300 font-semibold">Tell us more</label>
      <textarea id="idea-description" required maxLength={2000} rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's the idea? Who would it help? A little context goes a long way." className={`${fieldClass} resize-y`} />
      <p className="mt-100 text-right text-200 text-muted-foreground">{description.length}/2000</p>
    </div>
    <div className="grid gap-400 sm:grid-cols-2">
      <div><label htmlFor="idea-category" className="mb-200 block text-300 font-semibold">Category</label>
        <select id="idea-category" value={category} onChange={(e) => setCategory(e.target.value)} className={fieldClass}>
          {categories.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <div><label htmlFor="idea-author" className="mb-200 block text-300 font-semibold">Your display name</label>
        <input id="idea-author" required maxLength={100} readOnly={!!idea} value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
      </div>
    </div>
    {error}
    <button type="submit" disabled={pending || !canSave} className="flex min-h-control w-full items-center justify-center gap-200 rounded-xl bg-primary px-500 py-300 text-300 font-semibold text-primary-foreground transition-opacity hover:opacity-90">
      {pending ? 'Saving your idea...' : idea ? 'Save changes' : 'Publish idea'}<ArrowUpRight className="icon-size-300" />
    </button>
    <p className="text-center text-200 text-muted-foreground">Shared with the community. A small spark can go a long way.</p>
  </form>;
}
