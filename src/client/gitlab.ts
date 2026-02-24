import type { Gitlab } from '@gitbeaker/rest';
import type {
	Client,
	Comment,
	PullRequestClient,
	RepoContext,
	ReviewThread,
} from './index';
import { parsePullRequestUrl } from '../utils';

function createPullRequestClient(
	gitlab: InstanceType<typeof Gitlab>,
	projectId: string,
	mrIid: number
): PullRequestClient {
	return {
		async getComments() {
			const notes = await gitlab.MergeRequestNotes.all(projectId, mrIid);

			return notes.map(function (n): Comment {
				return {
					id: String(n.id),
					body: n.body,
					author: n.author?.username ?? 'unknown',
					createdAt: String(n.created_at),
					updatedAt: String(n.updated_at),
					isResolved: 'resolved' in n ? Boolean(n.resolved) : undefined,
				};
			});
		},

		async getComment(commentId: string) {
			const note = await gitlab.MergeRequestNotes.show(
				projectId,
				mrIid,
				parseInt(commentId)
			);

			return {
				id: String(note.id),
				body: note.body,
				author: note.author?.username ?? 'unknown',
				createdAt: String(note.created_at),
				updatedAt: String(note.updated_at),
				isResolved: 'resolved' in note ? Boolean(note.resolved) : undefined,
			};
		},

		async addComment(body: string) {
			const note = await gitlab.MergeRequestNotes.create(
				projectId,
				mrIid,
				body
			);

			return {
				id: String(note.id),
				body: note.body,
				author: note.author?.username ?? 'unknown',
				createdAt: String(note.created_at),
				updatedAt: String(note.updated_at),
			};
		},

		async deleteComment(commentId: string) {
			await gitlab.MergeRequestNotes.remove(
				projectId,
				mrIid,
				parseInt(commentId)
			);
		},

		async resolveComment(commentId: string) {
			await gitlab.MergeRequestDiscussions.editNote(
				projectId,
				mrIid,
				commentId,
				parseInt(commentId),
				{ resolved: true }
			);
		},

		async submitReview(review) {
			if (review.action === 'approve') {
				await gitlab.MergeRequestApprovals.approve(projectId, mrIid);
			} else if (review.body) {
				await gitlab.MergeRequestNotes.create(
					projectId,
					mrIid,
					review.body
				);
			}

			if (review.comments) {
				for (const c of review.comments) {
					await gitlab.MergeRequestNotes.create(
						projectId,
						mrIid,
						`**${c.path}:${c.line}**\n\n${c.body}`
					);
				}
			}
		},

		async updateTitle(title: string) {
			await gitlab.MergeRequests.edit(projectId, mrIid, { title });
		},

		async updateDescription(description: string) {
			await gitlab.MergeRequests.edit(projectId, mrIid, { description });
		},

		async getReviewThreads() {
			const discussions = await gitlab.MergeRequestDiscussions.all(
				projectId,
				mrIid
			);

			const threads: ReviewThread[] = [];

			for (const d of discussions) {
				const notes = d.notes as Record<string, any>[] | undefined;
				if (d.individual_note || !notes?.length) continue;

				const firstNote = notes[0];
				if (firstNote.type !== 'DiffNote' || !firstNote.position)
					continue;

				const pos = firstNote.position;
				const path = pos.new_path ?? pos.old_path ?? '';
				const line = Number(pos.new_line ?? pos.old_line ?? 0);

				const isResolved = notes.every(function (note) {
					return !note.resolvable || Boolean(note.resolved);
				});

				threads.push({
					id: d.id,
					path,
					line,
					isResolved,
					comments: notes.map(function (note) {
						return {
							author: note.author?.username ?? 'unknown',
							body: note.body,
							createdAt: String(note.created_at),
						};
					}),
				});
			}

			return threads;
		},
	};
}

export function createGitLabClient(
	gitlab: InstanceType<typeof Gitlab>,
	ctx: RepoContext
): Client {
	const projectId = `${ctx.owner}/${ctx.repo}`;

	return {
		pullRequest(id: string) {
			return createPullRequestClient(gitlab, projectId, parseInt(id));
		},

		fromUrl(prUrl: string) {
			const parsed = parsePullRequestUrl(prUrl);
			if (!parsed) {
				throw new Error(`Invalid merge request URL: ${prUrl}`);
			}
			return createPullRequestClient(
				gitlab,
				`${parsed.owner}/${parsed.name}`,
				parseInt(parsed.pr_number)
			);
		},
	};
}
