import { Command } from 'commander';
import { authCommand } from './auth';
import { octokit, parsePullRequestUrl } from '../../utils';

export const githubCommand = new Command('github')
	.alias('gh')
	.description('GitHub repository commands');

githubCommand.addCommand(authCommand);

githubCommand
	.command('view')
	.description('View the review contents of a pull request')
	.argument('<pr-url>', 'The URL of the pull request to view')
	.action(async function (prUrl) {
		const parsedUrl = parsePullRequestUrl(prUrl);
		if (!parsedUrl) {
			console.error('Invalid pull request URL');
			process.exit(1);
		}
		const reviewComments = await (
			await octokit()
		).rest.pulls.listReviewComments({
			owner: parsedUrl.owner,
			repo: parsedUrl.name,
			pull_number: parseInt(parsedUrl.pr_number),
		});
		console.log(reviewComments.data);
	});

githubCommand
	.command('repos')
	.description('List your GitHub repositories')
	.option('-l, --limit <number>', 'Limit number of repos', '10')
	.action(function (options) {
		console.log(`Listing GitHub repos (limit: ${options.limit})`);
	});
