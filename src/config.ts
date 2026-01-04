import { z } from 'zod';
import { homedir } from 'os';
import { join } from 'path';

const ProviderConfigSchema = z.object({
	token: z.string().optional(),
	botUsername: z.string().optional(),
});

const ConfigSchema = z.object({
	github: ProviderConfigSchema,
	gitlab: ProviderConfigSchema,
	bitbucket: ProviderConfigSchema,
	state: z.object({
		pullRequestUrl: z.string().optional(),
	}),
});

export type Config = z.infer<typeof ConfigSchema>;

const CONFIG_PATH = join(homedir(), '.rv.json');

function getDefaultConfig(): Config {
	return {
		github: {},
		gitlab: {},
		bitbucket: {},
		state: {
			pullRequestUrl: undefined,
		},
	};
}

export async function loadConfig(): Promise<Config> {
	try {
		const file = Bun.file(CONFIG_PATH);
		const exists = await file.exists();

		if (!exists) {
			// we need to create the file and set the default config
			await Bun.write(CONFIG_PATH, JSON.stringify(getDefaultConfig(), null, 2));
			return getDefaultConfig();
		}

		const raw = await file.json();
		return ConfigSchema.parse(raw);
	} catch {
		return getDefaultConfig();
	}
}

export async function saveConfig(config: Config): Promise<void> {
	const validated = ConfigSchema.parse(config);
	await Bun.write(CONFIG_PATH, JSON.stringify(validated, null, 2));
}

export async function setGithubToken(token: string): Promise<void> {
	const config = await loadConfig();
	config.github.token = token;
	await saveConfig(config);
}

export async function getGithubToken(): Promise<string | undefined> {
	const config = await loadConfig();
	return config.github.token;
}

export async function clearGithubToken(): Promise<void> {
	const config = await loadConfig();
	delete config.github.token;
	await saveConfig(config);
}

export type Provider = 'github' | 'gitlab' | 'bitbucket';

export async function getProviderToken(
	provider: Provider
): Promise<string | undefined> {
	const config = await loadConfig();
	return config[provider].token;
}

export async function setupState(options: {
	pullRequestUrl: string;
	botUsername: string;
	provider: Provider;
}): Promise<void> {
	const config = await loadConfig();
	config.state.pullRequestUrl = options.pullRequestUrl;
	config[options.provider].botUsername = options.botUsername;
	await saveConfig(config);
}
