import { authenticated, entity, one, text, uuid } from '@microsoft/rayfin-core';
import { Idea } from './Idea.js';

@entity()
@authenticated('read')
@authenticated(['create', 'delete'], {
  policy: (claims, vote) => claims.sub.eq(vote.owner_id),
})
export class IdeaVote {
  @uuid() id!: string;
  @uuid() idea_id!: string;
  @one(() => Idea) idea!: Idea;
  @text({ max: 200 }) owner_id!: string;
}
