import { Command, Flags } from "@oclif/core";
import { readAuthConfig } from "../../utils/utils.js";
import chalk from "chalk";
import { getProjects, type Compose } from "../../utils/shared.js";
import inquirer from "inquirer";
import type { Answers } from "../app/create.js";
import axios from "axios";

const SOURCE_TYPES = ["git", "github", "gitlab", "bitbucket", "gitea", "raw"] as const;
type SourceType = typeof SOURCE_TYPES[number];

export default class ComposeSource extends Command {
	static description = "Configure the deployment source for a compose service.";

	static examples = [
		"$ <%= config.bin %> compose source",
		"$ <%= config.bin %> compose source -c <composeId> --sourceType git --customGitUrl git@github.com:org/repo.git --customGitBranch main -y",
		"$ <%= config.bin %> compose source -c <composeId> --sourceType github --repository my-repo --owner my-org --branch main --githubId <id> -y",
		"$ <%= config.bin %> compose source -c <composeId> --sourceType gitea --giteaRepository my-repo --giteaOwner my-org --giteaBranch main --giteaId <id> -y",
		"$ <%= config.bin %> compose source -c <composeId> --sourceType raw -y",
	];

	static flags = {
		composeId: Flags.string({
			char: "c",
			description: "ID of the compose service",
			required: false,
		}),
		projectId: Flags.string({
			char: "p",
			description: "ID of the project",
			required: false,
		}),
		environmentId: Flags.string({
			char: "e",
			description: "ID of the environment",
			required: false,
		}),
		sourceType: Flags.string({
			char: "s",
			description: "Source type (git, github, gitlab, bitbucket, gitea, raw)",
			required: false,
			options: [...SOURCE_TYPES],
		}),
		// Generic git fields
		customGitUrl: Flags.string({
			description: "Git repository URL (for sourceType=git)",
			required: false,
		}),
		customGitBranch: Flags.string({
			description: "Git branch (for sourceType=git)",
			required: false,
		}),
		customGitSSHKeyId: Flags.string({
			description: "SSH key ID for git authentication (for sourceType=git)",
			required: false,
		}),
		// GitHub fields
		repository: Flags.string({
			description: "Repository name (for sourceType=github)",
			required: false,
		}),
		owner: Flags.string({
			description: "Repository owner (for sourceType=github)",
			required: false,
		}),
		branch: Flags.string({
			description: "Branch name (for sourceType=github)",
			required: false,
		}),
		githubId: Flags.string({
			description: "GitHub integration ID (for sourceType=github)",
			required: false,
		}),
		// GitLab fields
		gitlabRepository: Flags.string({
			description: "Repository name (for sourceType=gitlab)",
			required: false,
		}),
		gitlabOwner: Flags.string({
			description: "Repository owner (for sourceType=gitlab)",
			required: false,
		}),
		gitlabBranch: Flags.string({
			description: "Branch name (for sourceType=gitlab)",
			required: false,
		}),
		gitlabProjectId: Flags.integer({
			description: "GitLab project ID (for sourceType=gitlab)",
			required: false,
		}),
		gitlabId: Flags.string({
			description: "GitLab integration ID (for sourceType=gitlab)",
			required: false,
		}),
		// Bitbucket fields
		bitbucketRepository: Flags.string({
			description: "Repository name (for sourceType=bitbucket)",
			required: false,
		}),
		bitbucketOwner: Flags.string({
			description: "Repository owner (for sourceType=bitbucket)",
			required: false,
		}),
		bitbucketBranch: Flags.string({
			description: "Branch name (for sourceType=bitbucket)",
			required: false,
		}),
		bitbucketId: Flags.string({
			description: "Bitbucket integration ID (for sourceType=bitbucket)",
			required: false,
		}),
		// Gitea fields
		giteaRepository: Flags.string({
			description: "Repository name (for sourceType=gitea)",
			required: false,
		}),
		giteaOwner: Flags.string({
			description: "Repository owner (for sourceType=gitea)",
			required: false,
		}),
		giteaBranch: Flags.string({
			description: "Branch name (for sourceType=gitea)",
			required: false,
		}),
		giteaId: Flags.string({
			description: "Gitea integration ID (for sourceType=gitea)",
			required: false,
		}),
		// Common fields
		composePath: Flags.string({
			description: "Path to compose file (default: ./docker-compose.yml)",
			required: false,
		}),
		autoDeploy: Flags.boolean({
			description: "Enable auto-deploy on push",
			required: false,
			allowNo: true,
		}),
		skipConfirm: Flags.boolean({
			char: "y",
			description: "Skip confirmation prompt",
			default: false,
		}),
	};

	public async run(): Promise<void> {
		const auth = await readAuthConfig(this);
		const { flags } = await this.parse(ComposeSource);
		let { projectId, composeId, environmentId, sourceType } = flags;

		// Interactive compose selection (same pattern as deploy.ts)
		if (!composeId) {
			console.log(chalk.blue.bold("\n  Listing all Projects \n"));
			const projects = await getProjects(auth, this);

			let selectedProject;
			let selectedEnvironment;

			if (!projectId) {
				const { project } = await inquirer.prompt<Answers>([
					{
						choices: projects.map((project) => ({
							name: project.name,
							value: project,
						})),
						message: "Select a project:",
						name: "project",
						type: "list",
					},
				]);
				selectedProject = project;
				projectId = project.projectId;
			} else {
				selectedProject = projects.find(p => p.projectId === projectId);
			}

			if (!environmentId) {
				if (!selectedProject?.environments || selectedProject.environments.length === 0) {
					this.error(chalk.yellow("No environments found in this project."));
				}

				const { environment } = await inquirer.prompt([
					{
						choices: selectedProject.environments.map((env) => ({
							name: `${env.name} (${env.description})`,
							value: env,
						})),
						message: "Select an environment:",
						name: "environment",
						type: "list",
					},
				]);
				selectedEnvironment = environment;
				environmentId = environment.environmentId;
			} else {
				selectedEnvironment = selectedProject?.environments?.find(e => e.environmentId === environmentId);
			}

			if (!selectedEnvironment?.compose || selectedEnvironment.compose.length === 0) {
				this.error(chalk.yellow("No compose services found in this environment."));
			}

			const composeAnswers = await inquirer.prompt([
				{
					choices: selectedEnvironment.compose.map((c: Compose) => ({
						name: c.name,
						value: c.composeId,
					})),
					message: "Select the compose service to configure:",
					name: "selectedCompose",
					type: "list",
				},
			]);
			composeId = composeAnswers.selectedCompose;
		}

		// Interactive source type selection
		if (!sourceType) {
			const { selectedSourceType } = await inquirer.prompt([
				{
					choices: SOURCE_TYPES.map(t => ({ name: t, value: t })),
					message: "Select source type:",
					name: "selectedSourceType",
					type: "list",
				},
			]);
			sourceType = selectedSourceType;
		}

		// Build the update payload
		const payload: Record<string, unknown> = {
			composeId,
			sourceType,
		};

		if (flags.composePath !== undefined) {
			payload.composePath = flags.composePath;
		}
		if (flags.autoDeploy !== undefined) {
			payload.autoDeploy = flags.autoDeploy;
		}

		switch (sourceType as SourceType) {
			case "git":
				if (flags.customGitUrl !== undefined) payload.customGitUrl = flags.customGitUrl;
				if (flags.customGitBranch !== undefined) payload.customGitBranch = flags.customGitBranch;
				if (flags.customGitSSHKeyId !== undefined) payload.customGitSSHKeyId = flags.customGitSSHKeyId;
				break;
			case "github":
				if (flags.repository !== undefined) payload.repository = flags.repository;
				if (flags.owner !== undefined) payload.owner = flags.owner;
				if (flags.branch !== undefined) payload.branch = flags.branch;
				if (flags.githubId !== undefined) payload.githubId = flags.githubId;
				break;
			case "gitlab":
				if (flags.gitlabRepository !== undefined) payload.gitlabRepository = flags.gitlabRepository;
				if (flags.gitlabOwner !== undefined) payload.gitlabOwner = flags.gitlabOwner;
				if (flags.gitlabBranch !== undefined) payload.gitlabBranch = flags.gitlabBranch;
				if (flags.gitlabProjectId !== undefined) payload.gitlabProjectId = flags.gitlabProjectId;
				if (flags.gitlabId !== undefined) payload.gitlabId = flags.gitlabId;
				break;
			case "bitbucket":
				if (flags.bitbucketRepository !== undefined) payload.bitbucketRepository = flags.bitbucketRepository;
				if (flags.bitbucketOwner !== undefined) payload.bitbucketOwner = flags.bitbucketOwner;
				if (flags.bitbucketBranch !== undefined) payload.bitbucketBranch = flags.bitbucketBranch;
				if (flags.bitbucketId !== undefined) payload.bitbucketId = flags.bitbucketId;
				break;
			case "gitea":
				if (flags.giteaRepository !== undefined) payload.giteaRepository = flags.giteaRepository;
				if (flags.giteaOwner !== undefined) payload.giteaOwner = flags.giteaOwner;
				if (flags.giteaBranch !== undefined) payload.giteaBranch = flags.giteaBranch;
				if (flags.giteaId !== undefined) payload.giteaId = flags.giteaId;
				break;
			case "raw":
				// No additional source fields needed for raw
				break;
		}

		if (!flags.skipConfirm) {
			console.log(chalk.blue("\nSource configuration:"));
			console.log(chalk.gray(JSON.stringify(payload, null, 2)));

			const confirmAnswers = await inquirer.prompt([
				{
					default: false,
					message: "Apply this source configuration?",
					name: "confirmSource",
					type: "confirm",
				},
			]);

			if (!confirmAnswers.confirmSource) {
				this.error(chalk.yellow("Source configuration cancelled."));
			}
		}

		try {
			const response = await axios.post(
				`${auth.url}/api/trpc/compose.update`,
				{
					json: payload,
				},
				{
					headers: {
						"x-api-key": auth.token,
						"Content-Type": "application/json",
					},
				},
			);

			if (response.status !== 200) {
				this.error(chalk.red("Error configuring compose source"));
			}
			this.log(chalk.green(`Compose source configured to '${sourceType}' successfully.`));
		} catch (error: any) {
			this.error(chalk.red(`Error configuring compose source: ${error.message}`));
		}
	}
}
