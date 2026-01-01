#!/usr/bin/env bun

import { program } from 'commander';
import { githubCommand } from './commands/github/index.js';
import { gitlabCommand } from './commands/gitlab/index.js';
import { bitbucketCommand } from './commands/bitbucket/index.js';

program
	.name('rv')
	.description('a code review cli tool for github, gitlab, and bitbucket')
	.version('1.0.0');

program.addCommand(githubCommand);
program.addCommand(gitlabCommand);
program.addCommand(bitbucketCommand);

program.parse();
