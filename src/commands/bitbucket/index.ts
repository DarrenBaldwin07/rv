import { Command } from 'commander';

export const bitbucketCommand = new Command('bitbucket')
	.alias('bb')
	.description('Bitbucket repository commands');

bitbucketCommand
	.command('auth')
	.description('Authenticate with Bitbucket')
	.option('-t, --token <token>', 'Use an app password')
	.action(function (options) {
		if (options.token) {
			console.log('Authenticating with Bitbucket using app password...');
		} else {
			console.log('Starting Bitbucket OAuth flow...');
		}
	});

bitbucketCommand
	.command('repos')
	.description('List your Bitbucket repositories')
	.option('-l, --limit <number>', 'Limit number of repos', '10')
	.action(function (options) {
		console.log(`Listing Bitbucket repos (limit: ${options.limit})`);
	});

bitbucketCommand
	.command('clone <repo>')
	.description('Clone a Bitbucket repository')
	.action(function (repo) {
		console.log(`Cloning Bitbucket repo: ${repo}`);
	});
