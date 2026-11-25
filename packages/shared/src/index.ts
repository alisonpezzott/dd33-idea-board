/**
 * Browser-safe contracts shared by the data registration package and frontend.
 *
 * Keep each record shape aligned with its decorated runtime entity in
 * `@rayfin-app/data`. This package must stay isomorphic, so do not import the
 * decorated classes here.
 */
export const categories = ['Product', 'Experience', 'Workplace', 'Community', 'Other'] as const;
export type IdeaCategory = (typeof categories)[number];

export interface IdeaRecord {
  id: string;
  title: string;
  description: string;
  category: string;
  author: string;
  createdAt: Date | string;
  owner_id: string;
}

export interface IdeaVoteRecord {
  id: string;
  idea_id: string;
  owner_id: string;
}

export type UniversalAppSchema = {
  Idea: IdeaRecord;
  IdeaVote: IdeaVoteRecord;
};
