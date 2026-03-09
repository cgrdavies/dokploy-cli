import {Args, Command, Flags} from '@oclif/core'
import {readAuthConfig} from "../../utils/utils.js";
import chalk from "chalk";
import {getProject, getProjects} from "../../utils/shared.js";
import inquirer from "inquirer";
import {Answers} from "../app/create.js";
import fs from 'fs';

export default class EnvPull extends Command {
    static override args = {
        file: Args.string({description: 'write to file', required: true}),
    }

    static override description = 'Store remote environment variables in local'

    static override examples = [
        '<%= config.bin %> <%= command.id %> .env.stage.local',
        '<%= config.bin %> <%= command.id %> .env.stage.local --projectId abc --environmentId def --applicationId ghi -y',
    ]

    static override flags = {
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
        applicationId: Flags.string({
            char: 'a',
            description: 'ID of the application to pull env from',
            required: false,
        }),
        composeId: Flags.string({
            char: 'c',
            description: 'ID of the compose service to pull env from',
            required: false,
        }),
        skipConfirm: Flags.boolean({
            char: 'y',
            description: 'Skip confirmation prompts',
            default: false,
        }),
    }

    public async run(): Promise<void> {
        const {args, flags} = await this.parse(EnvPull)
        let {projectId, environmentId, applicationId, composeId} = flags;

        if (fs.existsSync(args.file) && !flags.skipConfirm) {
            const {override} = await inquirer.prompt<any>([
                {
                    message: `Do you want to override ${args.file} file?`,
                    name: "override",
                    default: false,
                    type: "confirm",
                },
            ]);
            if (!override) {
                return
            }
        }
        const auth = await readAuthConfig(this);

        // If applicationId or composeId provided directly, fetch env from the API
        if (applicationId || composeId) {
            if (!projectId || !environmentId) {
                // We still need to find the env content via project data
                if (!projectId) {
                    this.error(chalk.red("--projectId is required when using --applicationId or --composeId"));
                }
            }
            const projectSelected = await getProject(projectId, auth, this);
            const environment = projectSelected.environments.find((env: any) => env.environmentId === environmentId);
            if (!environment) {
                this.error(chalk.red("Environment not found with the given environmentId."));
            }

            let env: string | undefined;
            if (applicationId) {
                const app = environment.applications.find((a: any) => a.applicationId === applicationId);
                if (!app) {
                    this.error(chalk.red("Application not found with the given applicationId."));
                }
                env = app.env;
            } else if (composeId) {
                const compose = environment.compose.find((c: any) => c.composeId === composeId);
                if (!compose) {
                    this.error(chalk.red("Compose service not found with the given composeId."));
                }
                env = compose.env;
            }

            fs.writeFileSync(args.file, env || "")
            this.log(chalk.green("Environment variable write to file successful."));
            return;
        }

        // Interactive mode
        console.log(chalk.blue.bold("\n  Listing all Projects \n"));
        const projects = await getProjects(auth, this);

        let selectedProject;
        if (!projectId) {
            const {project} = await inquirer.prompt<Answers>([
                {
                    choices: projects.map((project) => ({
                        name: project.name,
                        value: project,
                    })),
                    message: "Select the project:",
                    name: "project",
                    type: "list",
                },
            ]);
            selectedProject = project;
            projectId = project.projectId;
        } else {
            selectedProject = projects.find(p => p.projectId === projectId);
        }

        const projectSelected = await getProject(projectId, auth, this);

        let selectedEnvironment;
        if (!environmentId) {
            const {environment} = await inquirer.prompt<any>([
                {
                    choices: projectSelected.environments.map((environment: any) => ({
                        name: environment.name,
                        value: environment,
                    })),
                    message: "Select the environment:",
                    name: "environment",
                    type: "list",
                },
            ]);
            selectedEnvironment = environment;
            environmentId = environment.environmentId;
        } else {
            selectedEnvironment = projectSelected.environments.find((e: any) => e.environmentId === environmentId);
        }

        if (!selectedEnvironment) {
            this.error(chalk.red("Environment not found."));
        }

        const choices = [
            ...selectedEnvironment.applications.map((app: any) => ({
                name: `${app.name} (Application)`,
                value: app.env,
            })),
            ...selectedEnvironment.compose.map((compose: any) => ({
                name: `${compose.name} (Compose)`,
                value: compose.env,
            })),
        ]
        const {env} = await inquirer.prompt<any>([
            {
                choices,
                message: "Select a service to pull the environment variables:",
                name: "env",
                type: "list",
            },

        ]);


        fs.writeFileSync(args.file, env || "")
        this.log(chalk.green("Environment variable write to file successful."));


    }
}
