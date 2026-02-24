import type {
	Client,
	Comment,
	PullRequestClient,
	RepoContext,
} from './index';
import { parsePullRequestUrl } from '../utils';

interface BitbucketOptions {
	baseUrl?: string;
	token: string;
}

async function bbFetch(
	opts: BitbucketOptions,
	path: string,
	init?: RequestInit
): Promise<Response> {
	const base = opts.baseUrl ?? 'https://api.bitbucket.org/2.0';
	const res = await fetch(`${base}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${opts.token}`,
			'Content-Type': 'application/json',
			...init?.headers,
		},
	});

	if (!res.ok) {
		throw new Error(`Bitbucket API error: ${res.status} ${res.statusText}`);
	}

	return res;
}

function createPullRequestClient(
	opts: BitbucketOptions,
	ctx: RepoContext,
	prId: number
): PullRequestClient {
	const basePath = `/repositories/${ctx.owner}/${ctx.repo}/pullrequests/${prId}`;

	return {
		async getComments() {
			const res = await bbFetch(opts, `${basePath}/comments`);
			const data = await res.json();

			return (data.values ?? []).map(function (c: any): Comment {
				return {
					id: String(c.id),
					body: c.content?.raw ?? '',
					author: c.user?.display_name ?? 'unknown',
					createdAt: c.created_on ?? '',
					updatedAt: c.updated_on ?? '',
					isResolved: c.resolution?.type === 'resolved' ? true : undefined,
				};
			});
		},

		async getComment(commentId: string) {
			const res = await bbFetch(
				opts,
				`${basePath}/comments/${commentId}`
			);
			const c = await res.json();

			return {
				id: String(c.id),
				body: c.content?.raw ?? '',
				author: c.user?.display_name ?? 'unknown',
				createdAt: c.created_on ?? '',
				updatedAt: c.updated_on ?? '',
				isResolved: c.resolution?.type === 'resolved' ? true : undefined,
			};
		},

		async addComment(body: string) {
			const res = await bbFetch(opts, `${basePath}/comments`, {
				method: 'POST',
				body: JSON.stringify({ content: { raw: body } }),
			});
			const c = await res.json();

			return {
				id: String(c.id),
				body: c.content?.raw ?? '',
				author: c.user?.display_name ?? 'unknown',
				createdAt: c.created_on ?? '',
				updatedAt: c.updated_on ?? '',
			};
		},

		async deleteComment(commentId: string) {
			await bbFetch(opts, `${basePath}/comments/${commentId}`, {
				method: 'DELETE',
			});
		},

		async resolveComment(commentId: string) {
			await bbFetch(opts, `${basePath}/comments/${commentId}/resolve`, {
				method: 'PUT',
			});
		},

		async submitReview(review) {
			if (review.action === 'approve') {
				await bbFetch(opts, `${basePath}/approve`, { method: 'POST' });
			} else if (review.action === 'request_changes') {
				await bbFetch(opts, `${basePath}/request-changes`, {
					method: 'POST',
				});
			}

			if (review.body) {
				await bbFetch(opts, `${basePath}/comments`, {
					method: 'POST',
					body: JSON.stringify({ content: { raw: review.body } }),
				});
			}

			if (review.comments) {
				for (const c of review.comments) {
					await bbFetch(opts, `${basePath}/comments`, {
						method: 'POST',
						body: JSON.stringify({
							content: { raw: c.body },
							inline: { path: c.path, to: c.line },
						}),
					});
				}
			}
		},
	};
}

export function createBitbucketClient(
	opts: BitbucketOptions,
	ctx: RepoContext
): Client {
	return {
		pullRequest(id: string) {
			return createPullRequestClient(opts, ctx, parseInt(id));
		},

		fromUrl(prUrl: string) {
			const parsed = parsePullRequestUrl(prUrl);
			if (!parsed) {
				throw new Error(`Invalid pull request URL: ${prUrl}`);
			}
			return createPullRequestClient(
				opts,
				{ owner: parsed.owner, repo: parsed.name },
				parseInt(parsed.pr_number)
			);
		},
	};
}
