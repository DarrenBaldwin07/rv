import {
	createClient,
	createConfig,
	listPullRequestComments,
	getPullRequestComment,
	createPullRequestComment,
	deletePullRequestComment,
	resolvePullRequestComment,
	approvePullRequest,
	requestPullRequestChanges,
	updatePullRequest,
} from '@tembo-io/bitbucket';
import type {
	Client,
	Comment,
	PullRequestClient,
	RepoContext,
} from './index';
import { parsePullRequestUrl } from '../utils';

interface BitbucketOptions {
	token: string;
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
	bbClient: ReturnType<typeof createClient>,
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
			const { data, error } = await listPullRequestComments({
				client: bbClient,
				path,
			});

			if (error) {
				throw new Error(`Failed to get comments: ${JSON.stringify(error)}`);
			}

			return (data?.values ?? []).map(mapComment);
		},

		async getComment(commentId: string) {
			const { data, error } = await getPullRequestComment({
				client: bbClient,
				path: { ...path, comment_id: parseInt(commentId) },
			});

			if (error) {
				throw new Error(`Failed to get comment: ${JSON.stringify(error)}`);
			}

			return mapComment(data);
		},

		async addComment(body: string) {
			const { data, error } = await createPullRequestComment({
				client: bbClient,
				path,
				body: { content: { raw: body } } as any,
			});

			if (error) {
				throw new Error(`Failed to add comment: ${JSON.stringify(error)}`);
			}

			return mapComment(data);
		},

		async deleteComment(commentId: string) {
			const { error } = await deletePullRequestComment({
				client: bbClient,
				path: { ...path, comment_id: parseInt(commentId) },
			});

			if (error) {
				throw new Error(
					`Failed to delete comment: ${JSON.stringify(error)}`
				);
			}
		},

		async resolveComment(commentId: string) {
			const { error } = await resolvePullRequestComment({
				client: bbClient,
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
				const { error } = await approvePullRequest({
					client: bbClient,
					path,
				});
				if (error) {
					throw new Error(
						`Failed to approve: ${JSON.stringify(error)}`
					);
				}
			} else if (review.action === 'request_changes') {
				const { error } = await requestPullRequestChanges({
					client: bbClient,
					path,
				});
				if (error) {
					throw new Error(
						`Failed to request changes: ${JSON.stringify(error)}`
					);
				}
			}

			if (review.body) {
				await createPullRequestComment({
					client: bbClient,
					path,
					body: { content: { raw: review.body } } as any,
				});
			}

			if (review.comments) {
				for (const c of review.comments) {
					await createPullRequestComment({
						client: bbClient,
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
			const { error } = await updatePullRequest({
				client: bbClient,
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
			const { error } = await updatePullRequest({
				client: bbClient,
				path,
				body: { summary: { raw: description } } as any,
			});

			if (error) {
				throw new Error(
					`Failed to update description: ${JSON.stringify(error)}`
				);
			}
		},
	};
}

export function createBitbucketClient(
	opts: BitbucketOptions,
	ctx: RepoContext
): Client {
	const bbClient = createClient(
		createConfig({
			baseUrl: 'https://api.bitbucket.org/2.0',
			auth: opts.token,
		})
	);

	return {
		pullRequest(id: string) {
			return createPullRequestClient(bbClient, ctx, parseInt(id));
		},

		fromUrl(prUrl: string) {
			const parsed = parsePullRequestUrl(prUrl);
			if (!parsed) {
				throw new Error(`Invalid pull request URL: ${prUrl}`);
			}
			return createPullRequestClient(
				bbClient,
				{ owner: parsed.owner, repo: parsed.name },
				parseInt(parsed.pr_number)
			);
		},
	};
}
