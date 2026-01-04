import { Command } from 'commander';
import { getProviderToken, setupState, type Provider } from '../config';

const VALID_PROVIDERS: Provider[] = ['github', 'gitlab', 'bitbucket'];

export const setupCommand = new Command('setup')
	.description('Set up the review state for a pull request')
	.requiredOption('-u, --url <url>', 'Pull request URL')
	.requiredOption('-b, --bot <username>', 'Bot username')
	.requiredOption(
		'-p, --provider <provider>',
		'Provider (github, gitlab, bitbucket)'
	)
	.action(async function (options) {
		const provider = options.provider.toLowerCase() as Provider;

		if (!VALID_PROVIDERS.includes(provider)) {
			console.error(
				`✗ Invalid provider "${options.provider}". Must be one of: ${VALID_PROVIDERS.join(', ')}`
			);
			process.exit(1);
		}

		const token = await getProviderToken(provider);

		if (!token) {
			console.error(
				`✗ No auth token found for ${provider}. Please authenticate first using: rv ${provider} auth login`
			);
			process.exit(1);
		}

		await setupState({
			pullRequestUrl: options.url,
			botUsername: options.bot,
			provider,
		});

		console.log(`✓ Setup complete`);
		console.log(`  Provider: ${provider}`);
		console.log(`  PR URL: ${options.url}`);
		console.log(`  Bot username: ${options.bot}`);
	});
