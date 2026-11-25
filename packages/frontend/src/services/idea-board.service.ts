import type { IdeaRecord, IdeaVoteRecord } from '@rayfin-app/shared';
import { getRayfinClient, MissingRayfinConfigError } from '@/lib/rayfin-client';

export type IdeaInput = Pick<IdeaRecord, 'title' | 'description' | 'category'>;

interface Page<T> {
  items: T[];
  hasNextPage: boolean;
  endCursor?: string | null;
}

export async function collectPages<T>(load: (cursor?: string) => Promise<Page<T>>): Promise<T[]> {
  const rows: T[] = [];
  let cursor: string | undefined;
  do {
    const page = await load(cursor);
    rows.push(...page.items);
    if (!page.hasNextPage) return rows;
    if (!page.endCursor || page.endCursor === cursor) {
      throw new Error('The board could not finish loading. Please refresh and try again.');
    }
    cursor = page.endCursor;
  } while (cursor);
  return rows;
}

async function operation<T>(action: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error(`Idea Board: ${action} failed`, error);
    if (error instanceof MissingRayfinConfigError) {
      throw new Error('Idea Board is not connected yet. Ask the app owner to finish setting up the backend.');
    }
    throw new Error(`Could not ${action}. Check your connection and app permissions, then try again.`);
  }
}

export const ideaApi = {
  list: () => operation('load ideas', async () => {
    const client = await getRayfinClient();
    return collectPages<IdeaRecord>((cursor) => {
      const query = client.data.Idea
        .select(['id', 'title', 'description', 'category', 'author', 'owner_id', 'createdAt'])
        .orderBy({ id: 'asc' }).first(100);
      return (cursor ? query.after(cursor) : query).executePaginated();
    });
  }),
  create: (input: Omit<IdeaRecord, 'id'>) => operation('save your idea', async () => {
    const client = await getRayfinClient();
    const session = client.auth.getSession();
    if (!session.isAuthenticated || !session.user) throw new Error('Sign in before saving.');
    return client.data.Idea.create({ ...input, owner_id: session.user.id });
  }),
  update: (id: string, patch: Partial<IdeaInput>) => operation('update your idea', async () => {
    return (await getRayfinClient()).data.Idea.update({ id }, patch);
  }),
  remove: (id: string) => operation('delete your idea (ideas with votes must have their votes removed first)', async () => {
    await (await getRayfinClient()).data.Idea.delete({ id });
  }),
};

export const voteApi = {
  list: () => operation('load votes', async () => {
    const client = await getRayfinClient();
    return collectPages<IdeaVoteRecord>((cursor) => {
      const query = client.data.IdeaVote.select(['id', 'idea_id', 'owner_id'])
        .orderBy({ id: 'asc' }).first(100);
      return (cursor ? query.after(cursor) : query).executePaginated();
    });
  }),
  create: (input: Omit<IdeaVoteRecord, 'id'>) => operation('save your vote', async () => {
    const client = await getRayfinClient();
    const session = client.auth.getSession();
    if (!session.isAuthenticated || !session.user) throw new Error('Sign in before voting.');
    return client.data.IdeaVote.create({ ...input, owner_id: session.user.id });
  }),
  remove: (id: string) => operation('undo your vote', async () => {
    await (await getRayfinClient()).data.IdeaVote.delete({ id });
  }),
};
