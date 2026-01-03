export function parsePullRequestUrl(url?: string):
	| {
			owner: string;
			name: string;
			pr_number: string;
	  }
	| undefined {
	if (!url) return undefined;

	try {
		const urlObj = new URL(url);
		const pathParts = urlObj.pathname.split('/').filter(Boolean);

		// GitHub format: github.com/owner/repo/pull/123
		// GitLab format: gitlab.com/owner/repo/-/merge_requests/123
		if (pathParts.length >= 4) {
			const owner = pathParts[0];
			const name = pathParts[1];
			const prNumber = pathParts[pathParts.length - 1];

			if (owner && name && prNumber) {
				return {
					owner,
					name,
					pr_number: prNumber,
				};
			}
		}

		return undefined;
	} catch {
		return undefined;
	}
}
