import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IdeaRecord, IdeaVoteRecord } from '@rayfin-app/shared';
import { StrictMode } from 'react';
import App from '@/App';
import { ideaApi, voteApi } from '@/services/idea-board.service';

vi.mock('@/hooks/auth.context', () => ({
  useAuth: () => ({ session: { user: { id: 'me', email: 'alex@example.test' } } }),
}));
vi.mock('@/services/idea-board.service', () => ({
  ideaApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  voteApi: { list: vi.fn(), create: vi.fn(), remove: vi.fn() },
}));

const idea: IdeaRecord = {
  id: 'idea-1', title: 'A quieter workspace', description: 'Set aside a room for focused work.',
  category: 'Workplace', author: 'Alex', owner_id: 'me', createdAt: '2026-11-25T12:00:00Z',
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })));
  vi.mocked(ideaApi.list).mockResolvedValue([idea]);
  vi.mocked(voteApi.list).mockResolvedValue([]);
});

describe('Idea Board', () => {
  it('loads under StrictMode and filters real board content by search and category', async () => {
    render(<StrictMode><App /></StrictMode>);
    expect(await screen.findByRole('button', { name: idea.title })).toBeVisible();
    fireEvent.change(screen.getByLabelText('Search ideas'), { target: { value: 'nothing matches' } });
    expect(screen.getByText('No ideas here. Yet.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    fireEvent.click(screen.getByRole('button', { name: /^Product/ }));
    expect(screen.queryByRole('button', { name: idea.title })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Workplace/ }));
    expect(screen.getByRole('button', { name: idea.title })).toBeVisible();
  });

  it('allows repeated votes, then undoes just one owned vote', async () => {
    const saved: IdeaVoteRecord[] = [];
    vi.mocked(voteApi.create).mockImplementation(async (input) => {
      const vote = { ...input, id: `vote-${saved.length}` };
      saved.push(vote);
      return vote;
    });
    vi.mocked(voteApi.remove).mockResolvedValue();
    render(<App />);
    const button = await screen.findByRole('button', { name: `Vote for ${idea.title}` });
    fireEvent.click(button);
    await waitFor(() => expect(button).toBeEnabled());
    expect(button).toHaveTextContent('1');
    fireEvent.click(button);
    await waitFor(() => expect(button).toHaveTextContent('2'));
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: `Undo one vote for ${idea.title}` }));
    await waitFor(() => expect(button).toHaveTextContent('1'));
    expect(voteApi.create).toHaveBeenCalledTimes(2);
    expect(voteApi.remove).toHaveBeenCalledWith('vote-1');
  });

  it('rolls back a rejected vote and surfaces the failure', async () => {
    vi.mocked(voteApi.create).mockRejectedValue(new Error('Could not save your vote.'));
    render(<App />);
    const button = await screen.findByRole('button', { name: `Vote for ${idea.title}` });
    fireEvent.click(button);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save your vote.');
    expect(button).toHaveTextContent('0');
  });

  it('keeps form text after a failed save and renders the authoritative saved row after retry', async () => {
    vi.mocked(ideaApi.create).mockRejectedValueOnce(new Error('Could not save your idea.'));
    vi.mocked(ideaApi.create).mockImplementationOnce(async (input) => ({ ...input, id: 'new-idea', title: 'A saved idea' }));
    render(<App />);
    await screen.findByRole('button', { name: idea.title });
    fireEvent.click(screen.getByRole('button', { name: 'Share an idea' }));
    fireEvent.change(screen.getByLabelText('Give it a great title'), { target: { value: '  A fresh idea  ' } });
    fireEvent.change(screen.getByLabelText('Tell us more'), { target: { value: 'A useful improvement.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish idea' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save your idea.');
    expect(screen.getByLabelText('Give it a great title')).toHaveValue('  A fresh idea  ');
    fireEvent.click(screen.getByRole('button', { name: 'Publish idea' }));
    expect(await screen.findByRole('button', { name: 'A saved idea' })).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(ideaApi.create).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'A fresh idea', owner_id: 'me' }));
  });

  it('merges a partial edit response without losing the saved idea fields', async () => {
    vi.mocked(ideaApi.update).mockResolvedValue({ id: idea.id, title: 'Quiet corners' });
    render(<App />);
    await screen.findByRole('button', { name: idea.title });
    fireEvent.click(screen.getByRole('button', { name: `Edit ${idea.title}` }));
    fireEvent.change(screen.getByLabelText('Give it a great title'), { target: { value: 'Quiet corners' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('button', { name: 'Quiet corners' })).toBeVisible();
    expect(screen.getByText(idea.description)).toBeVisible();
    expect(screen.getByText(idea.author)).toBeVisible();
  });

  it('settles loading failures into an actionable error and can recover', async () => {
    vi.mocked(ideaApi.list).mockRejectedValueOnce(new Error('Could not load ideas.'));
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load ideas.');
    expect(screen.queryByRole('status', { name: 'Loading ideas' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('button', { name: idea.title })).toBeVisible();
  });

  it('requires confirmation to delete an owned idea without votes', async () => {
    vi.mocked(ideaApi.remove).mockResolvedValue();
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: `Delete ${idea.title}` }));
    expect(ideaApi.remove).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toHaveTextContent(idea.title);
    fireEvent.click(screen.getByRole('button', { name: 'Delete idea' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(ideaApi.remove).toHaveBeenCalledWith(idea.id);
    expect(screen.queryByRole('button', { name: idea.title })).not.toBeInTheDocument();
  });

  it('protects ideas with votes from deletion and hides controls on others’ ideas', async () => {
    vi.mocked(voteApi.list).mockResolvedValue([{ id: 'vote-1', idea_id: idea.id, owner_id: 'someone-else' }]);
    vi.mocked(ideaApi.list).mockResolvedValue([idea, { ...idea, id: 'other', title: 'Another idea', owner_id: 'someone-else' }]);
    render(<App />);
    expect(await screen.findByRole('button', { name: `Delete ${idea.title}` })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Delete Another idea' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Another idea' })).not.toBeInTheDocument();
  });
});
