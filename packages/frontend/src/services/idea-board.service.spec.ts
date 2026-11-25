import { describe, expect, it, vi } from 'vitest';
import { collectPages } from './idea-board.service';

describe('complete board queries', () => {
  it('follows all cursors so ideas and vote totals are not truncated at 100 rows', async () => {
    const load = vi.fn()
      .mockResolvedValueOnce({ items: [{ id: 'a' }], hasNextPage: true, endCursor: 'next' })
      .mockResolvedValueOnce({ items: [{ id: 'b' }], hasNextPage: false, endCursor: null });
    expect(await collectPages(load)).toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(load).toHaveBeenNthCalledWith(2, 'next');
  });

  it('rejects a stalled cursor instead of hanging or silently returning an incomplete total', async () => {
    const load = vi.fn().mockResolvedValue({ items: [], hasNextPage: true, endCursor: 'same' });
    await expect(collectPages(load)).rejects.toThrow('could not finish loading');
    expect(load).toHaveBeenCalledTimes(2);
  });
});
