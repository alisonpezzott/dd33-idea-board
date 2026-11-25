import { authenticated, date, entity, text, uuid } from '@microsoft/rayfin-core';

@entity()
@authenticated('read')
@authenticated('create', {
  policy: (claims, idea) => claims.sub.eq(idea.owner_id),
})
@authenticated('update', {
  policy: (claims, idea) => claims.sub.eq(idea.owner_id),
  include: ['title', 'description', 'category'],
})
@authenticated('delete', {
  policy: (claims, idea) => claims.sub.eq(idea.owner_id),
})
export class Idea {
  @uuid() id!: string;
  @text({ min: 1, max: 120 }) title!: string;
  @text({ min: 1, max: 2000 }) description!: string;
  @text({ max: 40 }) category!: string;
  @text({ max: 100 }) author!: string;
  @text({ max: 200 }) owner_id!: string;
  @date() createdAt!: Date;
}
