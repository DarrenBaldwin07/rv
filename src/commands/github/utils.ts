import { Octokit } from 'octokit';
import { getGithubToken } from '../../config';

export type GitHubUser = {
	login: string;
	name: string | null;
	id: number;
};

export async function validateToken(token: string): Promise<GitHubUser> {
	const octokit = new Octokit({ auth: token });
	const { data } = await octokit.rest.users.getAuthenticated();

	return {
		login: data.login,
		name: data.name,
		id: data.id,
	};
}

export async function octokit() {
	const token = await getGithubToken();
	if (!token) {
		throw new Error('GitHub token not found');
	}
	return new Octokit({ auth: token });
}
