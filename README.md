# rv

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.4. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## Features

- fix non-determnistic with coding agents (double approvals of PRs, commenting the same thing twice, etc)
- ability to add arbitrary postfix and prefix hard-coded content in PR comments (e.g "fix with @tembo", etc)
- unified interface to reviewing via different review apis between github, gitlab, and bitbucket
