import { Command } from 'commander';
import { setGithubToken, getGithubToken, clearGithubToken } from '../../config';
import { validateToken } from './utils';

export const authCommand = new Command('auth').description(
	'GitHub authentication commands'
);

authCommand
	.command('login')
	.description('Authenticate with GitHub using a personal access token')
	.requiredOption('-t, --token <token>', 'Personal access token')
	.action(async function (options) {
		try {
			console.log('Validating token...');
			const user = await validateToken(options.token);

			await setGithubToken(options.token);
			console.log(
				`✓ Authenticated as ${user.login}${user.name ? ` (${user.name})` : ''}`
			);
		} catch (error) {
			if (error instanceof Error && error.message.includes('Bad credentials')) {
				console.error('✗ Invalid token');
			} else {
				console.error('✗ Failed to authenticate:', error);
			}
			process.exit(1);
		}
	});

authCommand
	.command('logout')
	.description('Remove stored GitHub credentials')
	.action(async function () {
		try {
			await clearGithubToken();
			console.log('✓ GitHub credentials removed');
		} catch (error) {
			console.error('Failed to remove credentials:', error);
			process.exit(1);
		}
	});

authCommand
	.command('status')
	.description('Check authentication status')
	.action(async function () {
		try {
			const token = await getGithubToken();
			if (token) {
				const user = await validateToken(token);
				console.log(
					`✓ Authenticated as ${user.login}${
						user.name ? ` (${user.name})` : ''
					}`
				);
			} else {
				console.log('✗ Not authenticated with GitHub');
			}
		} catch (error) {
			if (error instanceof Error && error.message.includes('Bad credentials')) {
				console.log('✗ Stored token is invalid');
			} else {
				console.error('Failed to check status:', error);
			}
		}
	});
