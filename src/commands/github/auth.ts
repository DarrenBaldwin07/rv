import { Command } from 'commander';
import {
	setGithubToken,
	getGithubToken,
	clearGithubToken,
} from '../../config.js';

export const authCommand = new Command('auth').description(
	'GitHub authentication commands'
);

authCommand
	.command('login')
	.description('Authenticate with GitHub using a personal access token')
	.requiredOption('-t, --token <token>', 'Personal access token')
	.action(async function (options) {
		try {
			await setGithubToken(options.token);
			console.log('✓ GitHub token saved successfully');
		} catch (error) {
			console.error('Failed to save token:', error);
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
				const masked = token.slice(0, 4) + '...' + token.slice(-4);
				console.log(`✓ Authenticated with GitHub (token: ${masked})`);
			} else {
				console.log('✗ Not authenticated with GitHub');
			}
		} catch (error) {
			console.error('Failed to check status:', error);
			process.exit(1);
		}
	});
