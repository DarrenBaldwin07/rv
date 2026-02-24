export interface Comment {
	id: string;
	body: string;
	author: string;
	createdAt: string;
	updatedAt: string;
	isResolved?: boolean;
}

export type ReviewAction = 'approve' | 'request_changes' | 'comment';

export interface Review {
	action: ReviewAction;
	body?: string;
	comments?: ReviewComment[];
}

export interface ReviewComment {
	path: string;
	line: number;
	body: string;
}

export interface PullRequestClient {
	getComments(): Promise<Comment[]>;
	getComment(commentId: string): Promise<Comment>;
	addComment(body: string): Promise<Comment>;
	deleteComment(commentId: string): Promise<void>;
	resolveComment(commentId: string): Promise<void>;
	submitReview(review: Review): Promise<void>;
    updateDescription(description: string): Promise<void>;
    updateTitle(title: string): Promise<void>;
}

export interface RepoContext {
	owner: string;
	repo: string;
}

export interface Client {
	pullRequest(id: string): PullRequestClient;
	fromUrl(prUrl: string): PullRequestClient;
}
