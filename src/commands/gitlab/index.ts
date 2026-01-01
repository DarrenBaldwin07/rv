import { Command } from 'commander';

export const gitlabCommand = new Command('gitlab')
	.alias('gl')
	.description('GitLab repository commands');

gitlabCommand
	.command('auth')
	.description('Authenticate with GitLab')
	.option('-t, --token <token>', 'Use a personal access token')
	.action(function (options) {
		if (options.token) {
			console.log('Authenticating with GitLab using token...');
		} else {
			console.log('Starting GitLab OAuth flow...');
		}
	});

gitlabCommand
	.command('repos')
	.description('List your GitLab projects')
	.option('-l, --limit <number>', 'Limit number of projects', '10')
	.action(function (options) {
		console.log(`Listing GitLab projects (limit: ${options.limit})`);
	});

gitlabCommand
	.command('clone <project>')
	.description('Clone a GitLab project')
	.action(function (project) {
		console.log(`Cloning GitLab project: ${project}`);
	});
