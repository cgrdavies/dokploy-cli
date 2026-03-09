import { Command, Flags } from "@oclif/core";
import { readAuthConfig } from "../../utils/utils.js";
import chalk from "chalk";
import { getProject, getProjects, type Compose } from "../../utils/shared.js";
import inquirer from "inquirer";
import type { Answers } from "../app/create.js";
import axios from "axios";

export default class ComposeDeploy extends Command {
	static description = "Deploy a compose service.";

	static examples = [
		"$ <%= config.bin %> compose deploy",
		"$ <%= config.bin %> compose deploy -c <composeId> -y",
		"$ <%= config.bin %> compose deploy -p <projectId> -e <environmentId> -c <composeId> -y",
	];

	static flags = {
		composeId: Flags.string({
			char: 'c',
			description: 'ID of the compose service to deploy',
			required: false,
		}),
		projectId: Flags.string({
			char: 'p',
			description: 'ID of the project',
			required: false,
		}),
		environmentId: Flags.string({
			char: 'e',
			description: 'ID of the environment',
			required: false,
		}),
		skipConfirm: Flags.boolean({
			char: 'y',
			description: 'Skip confirmation prompt',
			default: false,
		})
	};

	public async run(): Promise<void> {
		const auth = await readAuthConfig(this);
		const { flags } = await this.parse(ComposeDeploy);
		let { projectId, composeId, environmentId } = flags;

		if (!projectId || !composeId || !environmentId) {
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
						message: "Select a project to deploy the compose service from:",
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

			if (!composeId) {
				if (!selectedEnvironment?.compose || selectedEnvironment.compose.length === 0) {
					this.error(chalk.yellow("No compose services found in this environment."));
				}

				const composeAnswers = await inquirer.prompt([
					{
						choices: selectedEnvironment.compose.map((c: Compose) => ({
							name: c.name,
							value: c.composeId,
						})),
						message: "Select the compose service to deploy:",
						name: "selectedCompose",
						type: "list",
					},
				]);
				composeId = composeAnswers.selectedCompose;
			}
		}

		if (!flags.skipConfirm) {
			const confirmAnswers = await inquirer.prompt([
				{
					default: false,
					message: "Are you sure you want to deploy this compose service?",
					name: "confirmDeploy",
					type: "confirm",
				},
			]);

			if (!confirmAnswers.confirmDeploy) {
				this.error(chalk.yellow("Compose deployment cancelled."));
			}
		}

		try {
			const response = await axios.post(
				`${auth.url}/api/trpc/compose.deploy`,
				{
					json: {
						composeId,
					},
				},
				{
					headers: {
						"x-api-key": auth.token,
						"Content-Type": "application/json",
					},
				},
			);

			if (response.status !== 200) {
				this.error(chalk.red("Error deploying compose service"));
			}
			this.log(chalk.green("Compose service deploy successful."));
		} catch (error: any) {
			this.error(chalk.red(`Error deploying compose service: ${error.message}`));
		}
	}
}
