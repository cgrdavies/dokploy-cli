import { Command, Flags } from "@oclif/core";
import axios from "axios";
import chalk from "chalk";
import inquirer from "inquirer";

import { type Project, getProjects } from "../../utils/shared.js";
import { slugify } from "../../utils/slug.js";
import { readAuthConfig } from "../../utils/utils.js";
import type { Answers } from "../app/create.js";

export default class ComposeCreate extends Command {
	static description = "Create a new compose service within a project.";

	static examples = [
		"$ <%= config.bin %> compose create",
		"$ <%= config.bin %> compose create -p <projectId> -e <environmentId> -n 'My Service' --appName my-service -y",
	];

	static flags = {
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
		name: Flags.string({
			char: "n",
			description: "Compose service name",
			required: false,
		}),
		description: Flags.string({
			char: "d",
			description: "Compose service description",
			required: false,
		}),
		appName: Flags.string({
			description: "Docker app name (slug)",
			required: false,
		}),
		composeType: Flags.string({
			description: "Compose type (docker-compose or stack)",
			default: "docker-compose",
		}),
		skipConfirm: Flags.boolean({
			char: "y",
			description: "Skip confirmation prompt",
			default: false,
		}),
	};

	public async run(): Promise<void> {
		const auth = await readAuthConfig(this);
		const { flags } = await this.parse(ComposeCreate);
		let { projectId, environmentId, name, description, appName, composeType } = flags;

		if (!projectId || !environmentId || !name || !appName) {
			console.log(chalk.blue.bold("\n  Listing all Projects \n"));
			const projects = await getProjects(auth, this);

			let selectedProject;

			if (!projectId) {
				const { project } = await inquirer.prompt<Answers>([
					{
						choices: projects.map((project) => ({
							name: project.name,
							value: project,
						})),
						message: "Select a project to create the compose service in:",
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
				environmentId = environment.environmentId;
			}

			if (!name || !appName) {
				const details = await inquirer.prompt([
					{
						message: "Enter the compose service name:",
						name: "name",
						type: "input",
						validate: (input) => (input ? true : "Name is required"),
						default: name,
					},
					{
						message: "Enter the description (optional):",
						name: "description",
						type: "input",
						default: description,
					},
				]);

				name = details.name;
				description = details.description;

				const appNamePrompt = await inquirer.prompt([
					{
						default: appName || `${slugify(name)}`,
						message: "Enter the App name:",
						name: "appName",
						type: "input",
						validate: (input) => (input ? true : "App name is required"),
					},
				]);

				appName = appNamePrompt.appName;
			}
		}

		if (!flags.skipConfirm) {
			const confirm = await inquirer.prompt([
				{
					type: 'confirm',
					name: 'proceed',
					message: 'Do you want to create this compose service?',
					default: false,
				},
			]);

			if (!confirm.proceed) {
				this.error(chalk.yellow("Compose creation cancelled."));
				return;
			}
		}

		try {
			const response = await axios.post(
				`${auth.url}/api/trpc/compose.create`,
				{
					json: {
						name,
						description,
						appName,
						environmentId,
						composeType,
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
				this.error(chalk.red("Error creating compose service"));
			}

			this.log(chalk.green(`Compose service '${name}' created successfully.`));
		} catch (error: any) {
			this.error(chalk.red(`Error creating compose service: ${error.message}`));
		}
	}
}
