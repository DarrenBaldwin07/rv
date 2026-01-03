import { Command } from 'commander';
import { authCommand } from './auth';

export const githubCommand = new Command('github')
	.alias('gh')
	.description('GitHub repository commands');

githubCommand.addCommand(authCommand);

githubCommand
	.command('repos')
	.description('List your GitHub repositories')
	.option('-l, --limit <number>', 'Limit number of repos', '10')
	.action(function (options) {
		console.log(`Listing GitHub repos (limit: ${options.limit})`);
	});
