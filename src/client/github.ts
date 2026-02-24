import { Octokit } from 'octokit';
import type {
	Client,
	Comment,
	PullRequestClient,
	RepoContext,
	ReviewThread,
} from './index';
import { parsePullRequestUrl } from '../utils';

const REVIEW_THREADS_QUERY = `
query($owner: String!, $repo: String!, $number: Int!, $cursor: String) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $number) {
      reviewThreads(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          isResolved
          path
          line
          comments(first: 100) {
            nodes {
              body
              author { login }
              createdAt
            }
          }
        }
      }
    }
  }
}
`;

interface ThreadsGraphQLResponse {
	repository: {
		pullRequest: {
			reviewThreads: {
				pageInfo: { hasNextPage: boolean; endCursor: string | null };
				nodes: Array<{
					id: string;
					isResolved: boolean;
					path: string;
					line: number;
					comments: {
						nodes: Array<{
							body: string;
							author: { login: string } | null;
							createdAt: string;
						}>;
					};
				}>;
			};
		};
	};
}

function createPullRequestClient(
	octokit: Octokit,
	ctx: RepoContext,
	prNumber: number
): PullRequestClient {
	return {
		async getComments() {
			const { data } = await octokit.rest.pulls.listReviewComments({
				owner: ctx.owner,
				repo: ctx.repo,
				pull_number: prNumber,
			});

			return data.map(function (c): Comment {
				return {
					id: String(c.id),
					body: c.body,
					author: c.user?.login ?? 'unknown',
					createdAt: c.created_at,
					updatedAt: c.updated_at,
				};
			});
		},

		async getComment(commentId: string) {
			const { data } = await octokit.rest.pulls.getReviewComment({
				owner: ctx.owner,
				repo: ctx.repo,
				comment_id: parseInt(commentId),
			});

			return {
				id: String(data.id),
				body: data.body,
				author: data.user?.login ?? 'unknown',
				createdAt: data.created_at,
				updatedAt: data.updated_at,
			};
		},

		async addComment(body: string) {
			const { data } = await octokit.rest.issues.createComment({
				owner: ctx.owner,
				repo: ctx.repo,
				issue_number: prNumber,
				body,
			});

			return {
				id: String(data.id),
				body: data.body ?? '',
				author: data.user?.login ?? 'unknown',
				createdAt: data.created_at,
				updatedAt: data.updated_at,
			};
		},

		async deleteComment(commentId: string) {
			await octokit.rest.issues.deleteComment({
				owner: ctx.owner,
				repo: ctx.repo,
				comment_id: parseInt(commentId),
			});
		},

		async resolveComment(_commentId: string) {
			throw new Error(
				'GitHub does not support resolving comments via API'
			);
		},

		async submitReview(review) {
			const event =
				review.action === 'approve'
					? 'APPROVE'
					: review.action === 'request_changes'
						? 'REQUEST_CHANGES'
						: 'COMMENT';

			await octokit.rest.pulls.createReview({
				owner: ctx.owner,
				repo: ctx.repo,
				pull_number: prNumber,
				event,
				body: review.body,
				comments: review.comments?.map(function (c) {
					return {
						path: c.path,
						line: c.line,
						body: c.body,
					};
				}),
			});
		},

		async updateTitle(title: string) {
			await octokit.rest.pulls.update({
				owner: ctx.owner,
				repo: ctx.repo,
				pull_number: prNumber,
				title,
			});
		},

		async updateDescription(description: string) {
			await octokit.rest.pulls.update({
				owner: ctx.owner,
				repo: ctx.repo,
				pull_number: prNumber,
				body: description,
			});
		},

		async getReviewThreads() {
			const threads: ReviewThread[] = [];
			let cursor: string | null = null;

			do {
				const result: ThreadsGraphQLResponse = await octokit.graphql(
					REVIEW_THREADS_QUERY,
					{
						owner: ctx.owner,
						repo: ctx.repo,
						number: prNumber,
						cursor,
					}
				);

				const page = result.repository.pullRequest.reviewThreads;

				for (const node of page.nodes) {
					threads.push({
						id: node.id,
						path: node.path,
						line: node.line,
						isResolved: node.isResolved,
						comments: node.comments.nodes.map(function (c) {
							return {
								author: c.author?.login ?? 'unknown',
								body: c.body,
								createdAt: c.createdAt,
							};
						}),
					});
				}

				cursor = page.pageInfo.hasNextPage
					? page.pageInfo.endCursor
					: null;
			} while (cursor);

			return threads;
		},
	};
}

export function createGitHubClient(
	octokit: Octokit,
	ctx: RepoContext
): Client {
	return {
		pullRequest(id: string) {
			return createPullRequestClient(octokit, ctx, parseInt(id));
		},

		fromUrl(prUrl: string) {
			const parsed = parsePullRequestUrl(prUrl);
			if (!parsed) {
				throw new Error(`Invalid pull request URL: ${prUrl}`);
			}
			return createPullRequestClient(
				octokit,
				{ owner: parsed.owner, repo: parsed.name },
				parseInt(parsed.pr_number)
			);
		},
	};
}
