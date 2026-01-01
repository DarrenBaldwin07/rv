import { Octokit } from 'octokit';

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
