import { useMemo, useState } from 'react';
import {
  ArrowDownWideNarrow, ArrowRight, ArrowUp, ArrowUpRight, Check, ChevronRight,
  CircleHelp, Compass, Heart, Layers3, Lightbulb, Moon, Pencil, Plus,
  Search, Sparkles, Sprout, Sun, Trash2, Undo2, Users, X,
} from 'lucide-react';
import { categories, type IdeaRecord } from '@rayfin-app/shared';
import { useAuth } from '@/hooks/auth.context';
import { useAppTheme } from '@/hooks/use-theme';
import { useCrud } from '@/components/useCrud';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { BoardDialog, IdeaForm } from '@/components/idea-dialog';
import { ideaApi, voteApi, type IdeaInput } from '@/services/idea-board.service';
import { cn } from '@/lib/utils';

type View = 'all' | 'mine' | 'voted';
const categoryStyles: Record<string, string> = {
  Product: 'bg-product text-product-foreground',
  Experience: 'bg-experience text-experience-foreground',
  Workplace: 'bg-workplace text-workplace-foreground',
  Community: 'bg-community text-community-foreground',
  Other: 'bg-muted text-muted-foreground',
};
const primaryButton = 'inline-flex min-h-control items-center justify-center gap-200 rounded-xl bg-primary px-500 py-300 text-300 font-semibold text-primary-foreground transition-opacity hover:opacity-90';
const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

function ideaDate(value: Date | string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : dateFormat.format(date);
}

function SparkIllustration() {
  return <div aria-hidden="true" className="relative hidden w-art shrink-0 items-center justify-center self-stretch md:flex">
    <svg viewBox="0 0 240 200" className="w-full overflow-visible text-foreground" fill="none">
      <circle cx="124" cy="99" r="77" className="fill-background/35" />
      <path d="M37 134c10-35 45-63 85-54s60 29 85-13" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 5" opacity=".3" />
      <g transform="rotate(-12 105 93)">
        <rect x="51" y="46" width="103" height="117" rx="12" className="fill-card stroke-foreground/15" strokeWidth="1.5" />
        <path d="M72 131h60M72 140h37" className="stroke-border" strokeWidth="4" strokeLinecap="round" />
        <path d="M92 106c0-10-12-11-12-25a22 22 0 0 1 44 0c0 14-12 15-12 25z" className="fill-accent stroke-foreground" strokeWidth="2" />
        <path d="M95 114h14m-11 6h8m-4-22V86m-7 0 7 6 7-6M102 47v-8M72 56l-6-6m67 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g transform="rotate(12 171 122)">
        <rect x="139" y="94" width="63" height="65" rx="10" className="fill-accent stroke-foreground/15" />
        <path d="m160 125 8 8 15-18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <path d="m179 34 3 10 10 3-10 3-3 10-3-10-10-3 10-3zM34 91l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" className="fill-foreground" />
      <circle cx="206" cy="87" r="4" className="fill-community-foreground" />
      <circle cx="48" cy="167" r="3" className="fill-workplace-foreground" />
    </svg>
  </div>;
}

function App() {
  const { session } = useAuth();
  const { isDark, toggleTheme } = useAppTheme();
  const ideas = useCrud(ideaApi);
  const votes = useCrud(voteApi);
  const user = session?.user;
  const ownerId = user?.id ?? '';
  const displayName = user?.email?.split('@')[0].replace(/[._-]/g, ' ') ?? '';
  const [view, setView] = useState<View>('all');
  const [category, setCategory] = useState('All categories');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('popular');
  const [form, setForm] = useState<false | 'new' | IdeaRecord>(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<IdeaRecord | null>(null);
  const [notice, setNotice] = useState('');
  const loading = ideas.status === 'loading' || votes.status === 'loading';
  const failed = ideas.status === 'error' || votes.status === 'error';
  const ready = !loading && !failed;
  const busy = ideas.pending || votes.pending;

  const voteCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const vote of votes.items) counts.set(vote.idea_id, (counts.get(vote.idea_id) ?? 0) + 1);
    return counts;
  }, [votes.items]);
  const myVotes = votes.items.filter((vote) => vote.owner_id === ownerId);
  const myVotedIds = new Set(myVotes.map((vote) => vote.idea_id));
  const myIdeas = ideas.items.filter((idea) => idea.owner_id === ownerId);
  const filtered = ideas.items.filter((idea) =>
    (view === 'all' || (view === 'mine' ? idea.owner_id === ownerId : myVotedIds.has(idea.id))) &&
    (category === 'All categories' || idea.category === category) &&
    `${idea.title} ${idea.description} ${idea.author}`.toLowerCase().includes(search.toLowerCase().trim())
  ).sort((a, b) => sort === 'popular'
    ? (voteCounts.get(b.id) ?? 0) - (voteCounts.get(a.id) ?? 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const detail = ideas.items.find((idea) => idea.id === detailId);

  function openForm(idea?: IdeaRecord) {
    ideas.clearError();
    setForm(idea ?? 'new');
  }

  async function saveIdea(input: IdeaInput, author: string) {
    const saved = form && form !== 'new'
      ? await ideas.update(form.id, input)
      : await ideas.create({ ...input, author, owner_id: ownerId, createdAt: new Date().toISOString() });
    if (saved) {
      setNotice(form === 'new' ? 'Your idea is on the board. Let the possibilities begin!' : 'Your idea has been updated.');
      setForm(false);
      setSearch('');
      setCategory('All categories');
      setView('all');
      setSort('newest');
    }
  }

  async function castVote(idea: IdeaRecord) {
    setNotice('');
    if (await votes.create({ idea_id: idea.id, owner_id: ownerId })) {
      setNotice(`Vote added to "${idea.title}". You can vote again!`);
    }
  }

  async function undoVote(idea: IdeaRecord) {
    const vote = myVotes.find((item) => item.idea_id === idea.id && !item.id.startsWith('pending-'));
    if (vote && await votes.remove(vote.id)) setNotice(`One of your votes for "${idea.title}" was removed.`);
  }

  async function deleteIdea() {
    if (deleting && await ideas.remove(deleting.id)) {
      setDeleting(null);
      setNotice('Your idea has been removed from the board.');
    }
  }

  function resetFilters() {
    setView('all'); setCategory('All categories'); setSearch('');
  }

  const navItems = [
    { value: 'all' as const, label: 'All ideas', icon: Compass, count: ideas.items.length },
    { value: 'mine' as const, label: 'My ideas', icon: Lightbulb, count: myIdeas.length },
    { value: 'voted' as const, label: "Ideas I've backed", icon: Heart, count: myVotedIds.size },
  ];

  return <div className="min-h-full">
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-board items-center justify-between gap-400 px-500 py-500 sm:px-800">
        <a href="#" onClick={(event) => { event.preventDefault(); resetFilters(); }} className="flex items-center gap-300 rounded-lg" aria-label="Idea Board home">
          <span className="flex rounded-xl bg-accent p-200 text-accent-foreground"><Lightbulb className="icon-size-500" strokeWidth={1.7} /></span>
          <span className="font-heading text-500 font-bold tracking-tight">idea board<span className="text-brand">.</span></span>
        </a>
        <div className="hidden items-center gap-800 text-300 font-medium sm:flex">
          <button onClick={resetFilters} className={cn('py-200', view === 'all' ? 'text-foreground' : 'text-muted-foreground')}>The board</button>
          <button onClick={() => { setView('mine'); setCategory('All categories'); setSearch(''); }} className={cn('py-200', view === 'mine' ? 'text-foreground' : 'text-muted-foreground')}>My ideas</button>
        </div>
        <div className="flex items-center gap-300">
          <button type="button" onClick={toggleTheme} aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} className="rounded-full p-200 text-muted-foreground hover:bg-muted">
            {isDark ? <Sun className="icon-size-300" /> : <Moon className="icon-size-300" />}
          </button>
          <span className="hidden h-600 border-l sm:block" />
          <span title="Your signed-in account" className="flex size-900 items-center justify-center rounded-full border bg-secondary font-heading text-300 font-semibold">{(displayName || 'You').slice(0, 2).toUpperCase()}</span>
        </div>
      </div>
    </header>

    <main className="mx-auto max-w-board px-500 pb-800 pt-800 sm:px-800">
      <section className="relative flex items-center justify-between gap-800 overflow-hidden rounded-4xl border border-primary/5 bg-hero px-600 py-800 sm:px-900 sm:py-900">
        <div className="relative z-10">
          <p className="mb-400 flex items-center gap-200 text-200 font-semibold uppercase tracking-widest"><span className="size-200 rounded-full bg-brand" /> A space for what's next</p>
          <h1 className="font-heading text-hero-800 font-semibold leading-tight tracking-tight sm:text-hero-900">Small sparks.<br />Big <span className="relative isolate whitespace-nowrap">possibilities.<span className="absolute inset-x-0 bottom-100 -z-10 h-300 -rotate-1 bg-accent" /></span></h1>
          <p className="mb-600 mt-400 max-w-lg text-300 leading-400 text-muted-foreground">The next great thing starts with an idea. Share yours,<br className="hidden sm:block" /> explore fresh perspectives, and give your favorites a lift.</p>
          <button onClick={() => openForm()} disabled={!ready || busy || !ownerId} className={primaryButton}><Plus className="icon-size-300" />Share an idea<ArrowUpRight className="ml-300 icon-size-300" /></button>
        </div>
        <SparkIllustration />
      </section>

      <div className="mb-800 mt-600 flex flex-wrap items-center justify-between gap-300 px-100 text-200 text-muted-foreground">
        <p className="flex items-center gap-200"><Users className="icon-size-200" /> A little collective imagination goes a long way.</p>
        <p className="flex items-center gap-200"><Lightbulb className="icon-size-200" /><strong className="text-foreground">{ready ? ideas.items.length.toLocaleString() : '—'}</strong> ideas<span className="mx-200">/</span><ArrowUp className="icon-size-200" /><strong className="text-foreground">{ready ? votes.items.length.toLocaleString() : '—'}</strong> votes and counting</p>
      </div>

      <div className="flex flex-col gap-800 lg:flex-row">
        <aside className="shrink-0 lg:w-rail">
          <p className="mb-300 px-300 text-100 font-bold uppercase tracking-widest text-muted-foreground">Explore the board</p>
          <nav aria-label="Board views" className="flex flex-wrap gap-100 lg:flex-col">
            {navItems.map(({ value, label, icon: Icon, count }) => <button key={value} onClick={() => { setView(value); setSearch(''); }} aria-pressed={view === value} className={cn('flex items-center gap-300 rounded-xl px-400 py-300 text-left text-[length:var(--text-300)] transition-colors', view === value ? 'bg-secondary font-semibold text-secondary-foreground' : 'text-muted-foreground hover:bg-muted')}>
              <Icon className="icon-size-300" strokeWidth={1.7} /><span className="flex-1">{label}</span><span className="min-w-500 text-right text-200">{ready ? count : '—'}</span>
            </button>)}
          </nav>
          <div className="my-600 hidden border-t lg:block" />
          <p className="mb-300 mt-600 px-300 text-100 font-bold uppercase tracking-widest text-muted-foreground lg:mt-0">Categories</p>
          <nav aria-label="Categories" className="flex flex-wrap gap-100 lg:flex-col">
            {['All categories', ...categories].map((item) => <button key={item} onClick={() => setCategory(item)} aria-pressed={category === item} className={cn('flex items-center gap-300 rounded-xl px-400 py-200 text-left text-[length:var(--text-300)] transition-colors', category === item ? 'bg-card font-semibold text-foreground' : 'text-muted-foreground hover:bg-muted')}>
              {item === 'All categories' ? <Layers3 className="icon-size-200" /> : <span className={cn('size-200 rounded-full', categoryStyles[item])} />}
              {item}<span className="ml-auto hidden text-200 lg:block">{ready ? (item === 'All categories' ? ideas.items.length : ideas.items.filter((idea) => idea.category === item).length) : '—'}</span>
            </button>)}
          </nav>
          <div className="mt-800 hidden rounded-3xl border bg-card p-500 lg:block">
            <span className="mb-400 inline-flex rounded-xl bg-accent/50 p-200 text-foreground"><Sprout className="icon-size-400" strokeWidth={1.5} /></span>
            <h2 className="font-heading text-400 font-semibold">A good idea grows<br />when you share it.</h2>
            <p className="mt-300 text-200 leading-300 text-muted-foreground">It doesn't have to be perfect. Sometimes a simple “what if” is all it takes.</p>
            <button onClick={() => openForm()} disabled={!ready || busy || !ownerId} className="mt-500 flex items-center gap-200 text-200 font-semibold">Plant a seed<ArrowRight className="icon-size-200" /></button>
          </div>
        </aside>

        <section aria-label="Ideas" className="min-w-0 flex-1">
          <div className="mb-500 flex flex-wrap items-center justify-between gap-400">
            <div className="flex items-center gap-300"><h2 className="font-heading text-600 font-semibold tracking-tight">{view === 'mine' ? 'Your bright ideas' : view === 'voted' ? "Ideas you've backed" : 'Fresh thinking, right here'}</h2><span className="rounded-full border px-200 py-100 text-200 text-muted-foreground">{ready ? filtered.length : '—'}</span></div>
            <span className="flex items-center gap-100 rounded-full bg-secondary px-300 py-100 text-100 font-semibold text-secondary-foreground"><Sparkles className="icon-size-100" /> Community powered</span>
          </div>
          <div className="mb-600 flex flex-col gap-300 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-400 top-1/2 icon-size-300 -translate-y-1/2 text-muted-foreground" />
              <label htmlFor="search-ideas" className="sr-only">Search ideas</label>
              <input id="search-ideas" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find your next favorite idea..." className="min-h-control w-full rounded-xl border bg-card py-300 pl-1000 pr-900 text-300 placeholder:text-muted-foreground" />
              {search && <button aria-label="Clear search" onClick={() => setSearch('')} className="absolute right-300 top-1/2 -translate-y-1/2 rounded-full p-100"><X className="icon-size-200" /></button>}
            </div>
            <div className="relative">
              <ArrowDownWideNarrow className="pointer-events-none absolute left-300 top-1/2 icon-size-200 -translate-y-1/2 text-muted-foreground" />
              <label htmlFor="sort-ideas" className="sr-only">Sort ideas</label>
              <select id="sort-ideas" value={sort} onChange={(event) => setSort(event.target.value)} className="min-h-control w-full rounded-xl border bg-card py-300 pl-900 pr-400 text-300 sm:w-auto"><option value="popular">Most popular</option><option value="newest">Newest first</option></select>
            </div>
          </div>

          <div role="status" aria-live="polite" className={notice ? 'mb-500 flex items-start gap-200 rounded-xl border border-brand/20 bg-secondary p-300 text-300' : 'sr-only'}>{notice && <Check className="icon-size-300 shrink-0" />}{notice}</div>
          {!form && ideas.error && <div className="mb-500"><ErrorState message={ideas.error} onRetry={() => void ideas.refresh()} /></div>}
          {votes.error && <div className="mb-500"><ErrorState message={votes.error} onRetry={() => void votes.refresh()} /></div>}
          {loading ? <LoadingState /> : failed ? <EmptyState title="Let's reconnect the board" hint="Use Retry above to load ideas and votes. Your saved ideas are still safe." /> :
            filtered.length === 0 ? <EmptyState title={ideas.items.length === 0 ? 'Big things start with one idea.' : 'No ideas here. Yet.'} hint={ideas.items.length === 0 ? 'Be the first to share a spark. This space is waiting for your perspective.' : 'Try a different search or category, or add a fresh perspective of your own.'} action={ideas.items.length === 0 ? <button onClick={() => openForm()} disabled={busy || !ownerId} className={primaryButton}><Plus className="icon-size-300" />Share the first idea</button> : <button onClick={resetFilters} className="rounded-xl bg-secondary px-400 py-300 text-300 font-semibold">Clear filters</button>} /> :
              <div className="grid gap-500 sm:grid-cols-2">
                {filtered.map((idea) => {
                  const ownVoteCount = myVotes.filter((vote) => vote.idea_id === idea.id).length;
                  return <article key={idea.id} className="group flex min-h-card flex-col rounded-3xl border bg-card p-500 shadow-card transition-shadow hover:shadow-md sm:p-600">
                    <div className="mb-400 flex items-center justify-between gap-200">
                      <span className={cn('inline-flex items-center gap-100 rounded-lg px-200 py-100 text-[length:var(--text-100)] font-semibold', categoryStyles[idea.category] ?? categoryStyles.Other)}><span className="size-100 rounded-full bg-current" />{idea.category}</span>
                      {idea.owner_id === ownerId && <div className="flex items-center gap-200">
                        <button aria-label={`Edit ${idea.title}`} disabled={busy || idea.id.startsWith('pending-')} onClick={() => openForm(idea)} className="rounded-lg p-100 text-muted-foreground hover:bg-muted"><Pencil className="icon-size-200" /></button>
                        <button aria-label={`Delete ${idea.title}`} title={(voteCounts.get(idea.id) ?? 0) > 0 ? 'Votes must be removed before deleting an idea.' : 'Delete your idea'} disabled={busy || idea.id.startsWith('pending-') || (voteCounts.get(idea.id) ?? 0) > 0} onClick={() => { ideas.clearError(); setDeleting(idea); }} className="rounded-lg p-100 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="icon-size-200" /></button>
                      </div>}
                    </div>
                    <h3 className="mb-300 font-heading text-500 font-semibold leading-500 tracking-tight"><button onClick={() => setDetailId(idea.id)} className="rounded-md text-left hover:text-brand">{idea.title}</button></h3>
                    <p className="mb-500 line-clamp-3 whitespace-pre-line break-words text-300 leading-300 text-muted-foreground">{idea.description}</p>
                    <div className="mt-auto flex items-end justify-between gap-300 border-t pt-400">
                      <div className="flex min-w-0 items-center gap-200"><span className={cn('flex size-800 shrink-0 items-center justify-center rounded-full text-[length:var(--text-100)] font-semibold', categoryStyles[idea.category] ?? categoryStyles.Other)}>{(idea.author || '?').slice(0, 2).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-200 font-medium">{idea.author || 'Community member'}</p><p className="mt-100 text-100 text-muted-foreground">{ideaDate(idea.createdAt)}</p></div></div>
                      <div className="flex shrink-0 items-center gap-100">
                        {ownVoteCount > 0 && <button onClick={() => void undoVote(idea)} disabled={busy} aria-label={`Undo one vote for ${idea.title}`} title={`You've given ${ownVoteCount} votes. Undo one.`} className="rounded-lg p-200 text-muted-foreground hover:bg-muted"><Undo2 className="icon-size-200" /></button>}
                        <button aria-label={`Vote for ${idea.title}`} disabled={busy || !ownerId || idea.id.startsWith('pending-')} onClick={() => void castVote(idea)} title="Give this idea a lift. Unlimited votes!" className={cn('flex min-h-control items-center gap-200 rounded-xl border px-300 py-200 text-[length:var(--text-300)] font-semibold transition-colors', ownVoteCount > 0 ? 'border-brand/25 bg-secondary text-brand' : 'bg-card hover:border-brand/25 hover:bg-secondary')}><ArrowUp className="icon-size-200" />{voteCounts.get(idea.id) ?? 0}</button>
                      </div>
                    </div>
                  </article>;
                })}
              </div>}
          <p className="mt-600 flex items-center justify-center gap-200 text-200 text-muted-foreground"><CircleHelp className="icon-size-200" />Love an idea? Give it a lift. Vote as often as you like.</p>
        </section>
      </div>
      <footer className="mt-1000 flex flex-wrap items-center justify-between gap-300 border-t pt-500 text-200 text-muted-foreground"><span className="flex items-center gap-200"><Lightbulb className="icon-size-200" />Small ideas. Shared possibilities.</span><span className="flex items-center gap-100">A little more “what if”<ChevronRight className="icon-size-100" /></span></footer>
    </main>

    <BoardDialog open={!!form} onOpenChange={(open) => { if (!open && !ideas.pending) setForm(false); }} title={form === 'new' ? 'Every great thing starts here.' : 'A little room to refine.'} description={form === 'new' ? 'A bold possibility, a small improvement, a wild what-if. We want to hear it.' : 'Give your idea a fresh perspective. Your votes stay right where they are.'}>
      {form && <IdeaForm key={form === 'new' ? 'new' : form.id} idea={form === 'new' ? undefined : form} author={displayName} pending={ideas.pending} error={ideas.error && <ErrorState message={ideas.error} />} onSave={saveIdea} />}
    </BoardDialog>
    <BoardDialog open={!!detail} onOpenChange={(open) => { if (!open) setDetailId(null); }} title={detail?.title ?? 'Idea'} description={detail ? `Shared by ${detail.author || 'a community member'} · ${ideaDate(detail.createdAt)}` : ''}>
      {detail && <div className="mt-600 space-y-500">
        <span className={cn('inline-block rounded-lg px-300 py-100 text-[length:var(--text-200)] font-semibold', categoryStyles[detail.category] ?? categoryStyles.Other)}>{detail.category}</span>
        <p className="whitespace-pre-wrap break-words text-400 leading-500">{detail.description}</p>
        {votes.error && <ErrorState message={votes.error} />}
        <button onClick={() => void castVote(detail)} disabled={busy || !ownerId} className={primaryButton}><ArrowUp className="icon-size-300" />Give it a lift · {voteCounts.get(detail.id) ?? 0}</button>
        <p className="text-200 text-muted-foreground">No limits on good ideas. Vote as often as you like.</p>
      </div>}
    </BoardDialog>
    <BoardDialog open={!!deleting} onOpenChange={(open) => { if (!open && !ideas.pending) setDeleting(null); }} title="Let this idea go?" description={`Delete "${deleting?.title ?? ''}"? This permanently removes your idea and cannot be undone. Ideas with votes cannot be deleted.`}>
      <div className="mt-600 space-y-400">
        {ideas.error && <ErrorState message={ideas.error} />}
        <div className="flex justify-end gap-300">
          <button onClick={() => setDeleting(null)} disabled={ideas.pending} className="rounded-xl border px-500 py-300 text-300 font-semibold">Keep idea</button>
          <button onClick={() => void deleteIdea()} disabled={ideas.pending} className="rounded-xl bg-destructive px-500 py-300 text-300 font-semibold text-destructive-foreground">{ideas.pending ? 'Deleting...' : 'Delete idea'}</button>
        </div>
      </div>
    </BoardDialog>
  </div>;
}

export default App;
