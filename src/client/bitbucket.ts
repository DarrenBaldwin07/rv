import {
	BitbucketClient,
	createClient,
	createConfig,
} from '@tembo-io/bitbucket';
import type {
	Client,
	Comment,
	PullRequestClient,
	RepoContext,
	ReviewThread,
} from './index';
import { parsePullRequestUrl } from '../utils';

interface BitbucketOptions {
	token: string;
}

function makeBitbucketClient(token: string): BitbucketClient {
	return new BitbucketClient({
		client: createClient(
			createConfig({
				baseUrl: 'https://api.bitbucket.org/2.0',
				auth: token,
			})
		),
	});
}

function mapComment(c: any): Comment {
	return {
		id: String(c.id),
		body: c.content?.raw ?? '',
		author: c.user?.display_name ?? 'unknown',
		createdAt: c.created_on ?? '',
		updatedAt: c.updated_on ?? '',
		isResolved: c.resolution ? true : undefined,
	};
}

function createPullRequestClient(
	bb: BitbucketClient,
	ctx: RepoContext,
	prId: number
): PullRequestClient {
	const path = {
		workspace: ctx.owner,
		repo_slug: ctx.repo,
		pull_request_id: prId,
	};

	return {
		async getComments() {
			const { data, error } = await bb.listPullRequestComments({
				path,
			});

			if (error) {
				throw new Error(`Failed to get comments: ${JSON.stringify(error)}`);
			}

			return (data?.values ?? []).map(mapComment);
		},

		async getComment(commentId: string) {
			const { data, error } = await bb.getPullRequestComment({
				path: { ...path, comment_id: parseInt(commentId) },
			});

			if (error) {
				throw new Error(`Failed to get comment: ${JSON.stringify(error)}`);
			}

			return mapComment(data);
		},

		async addComment(body: string) {
			const { data, error } = await bb.createPullRequestComment({
				path,
				body: { content: { raw: body } } as any,
			});

			if (error) {
				throw new Error(`Failed to add comment: ${JSON.stringify(error)}`);
			}

			return mapComment(data);
		},

		async deleteComment(commentId: string) {
			const { error } = await bb.deletePullRequestComment({
				path: { ...path, comment_id: parseInt(commentId) },
			});

			if (error) {
				throw new Error(
					`Failed to delete comment: ${JSON.stringify(error)}`
				);
			}
		},

		async resolveComment(commentId: string) {
			const { error } = await bb.resolvePullRequestComment({
				path: { ...path, comment_id: parseInt(commentId) },
			});

			if (error) {
				throw new Error(
					`Failed to resolve comment: ${JSON.stringify(error)}`
				);
			}
		},

		async submitReview(review) {
			if (review.action === 'approve') {
				const { error } = await bb.approvePullRequest({
					path,
				});
				if (error) {
					throw new Error(
						`Failed to approve: ${JSON.stringify(error)}`
					);
				}
			} else if (review.action === 'request_changes') {
				const { error } = await bb.requestPullRequestChanges({
					path,
				});
				if (error) {
					throw new Error(
						`Failed to request changes: ${JSON.stringify(error)}`
					);
				}
			}

			if (review.body) {
				await bb.createPullRequestComment({
					path,
					body: { content: { raw: review.body } } as any,
				});
			}

			if (review.comments) {
				for (const c of review.comments) {
					await bb.createPullRequestComment({
						path,
						body: {
							content: { raw: c.body },
							inline: { path: c.path, to: c.line },
						} as any,
					});
				}
			}
		},

		async updateTitle(title: string) {
			const { error } = await bb.updatePullRequest({
				path,
				body: { title } as any,
			});

			if (error) {
				throw new Error(
					`Failed to update title: ${JSON.stringify(error)}`
				);
			}
		},

		async updateDescription(description: string) {
			const { error } = await bb.updatePullRequest({
				path,
				body: { summary: { raw: description } } as any,
			});

			if (error) {
				throw new Error(
					`Failed to update description: ${JSON.stringify(error)}`
				);
			}
		},

		async getReviewThreads() {
			const { data, error } = await bb.listPullRequestComments({
				path,
			});

			if (error) {
				throw new Error(
					`Failed to get comments: ${JSON.stringify(error)}`
				);
			}

			const allComments = (data?.values ?? []) as any[];
			const rootComments = allComments.filter(
				(c: any) => c.inline && !c.parent
			);
			const byParent = new Map<number, any[]>();
			for (const c of allComments) {
				if (!c.parent) continue;
				const parentId = c.parent.id as number;
				const replies = byParent.get(parentId) ?? [];
				replies.push(c);
				byParent.set(parentId, replies);
			}

			const threads: ReviewThread[] = [];

			for (const root of rootComments) {
				const replies = byParent.get(root.id) ?? [];
				const all = [root, ...replies];

				threads.push({
					id: String(root.id),
					path: root.inline?.path ?? '',
					line: root.inline?.to ?? root.inline?.from ?? 0,
					isResolved: Boolean(root.resolution),
					comments: all.map(function (c: any) {
						return {
							author:
								c.user?.display_name ?? 'unknown',
							body: c.content?.raw ?? '',
							createdAt: c.created_on ?? '',
						};
					}),
				});
			}

			return threads;
		},
	};
}

export function createBitbucketClient(
	opts: BitbucketOptions,
	ctx: RepoContext
): Client {
	const bb = makeBitbucketClient(opts.token);

	return {
		pullRequest(id: string) {
			return createPullRequestClient(bb, ctx, parseInt(id));
		},

		fromUrl(prUrl: string) {
			const parsed = parsePullRequestUrl(prUrl);
			if (!parsed) {
				throw new Error(`Invalid pull request URL: ${prUrl}`);
			}
			return createPullRequestClient(
				bb,
				{ owner: parsed.owner, repo: parsed.name },
				parseInt(parsed.pr_number)
			);
		},
	};
}
