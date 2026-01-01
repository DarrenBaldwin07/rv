import { Command } from 'commander';

export const authCommand = new Command('auth').description(
	'GitHub authentication commands'
);

authCommand
	.command('login')
	.description('Authenticate with GitHub')
	.option('-t, --token <token>', 'Use a personal access token')
	.action(function (options) {
		if (options.token) {
			console.log('Authenticating with provided token...');
		} else {
			console.log('Starting GitHub OAuth flow...');
		}
	});

authCommand
	.command('logout')
	.description('Log out from GitHub')
	.action(function () {
		console.log('Logging out from GitHub...');
	});

authCommand
	.command('status')
	.description('Check authentication status')
	.action(function () {
		console.log('Checking GitHub auth status...');
	});
