---
name: dokploy
description: "Deploy and manage applications on Dokploy, our self-hosted PaaS at admin.yeeted.lol. Use when deploying services, managing Docker Compose projects, configuring environment variables, creating Dokploy applications, or setting up new services for deployment. Triggers on: deploy to dokploy, create dokploy project, push env vars, dokploy compose, set up deployment, manage dokploy app."
---

# Dokploy

Dokploy is our self-hosted PaaS at `https://admin.yeeted.lol`. All services are Docker Compose projects backed by Gitea repositories at `gitea.yeeted.lol`.

## Non-Interactive CLI Usage

**Every command supports fully non-interactive operation when all required flags are provided with `-y`.** Never run a command without all its required flags — missing any flag triggers an interactive picker that cannot be navigated by an LLM.

### Authentication

Before using any command, the CLI must be authenticated. First check if auth is already configured:

```bash
dokploy verify
```

If that fails, the user needs an API token. Guide them through it:

1. Open the Dokploy API token page in their browser:
   ```bash
   open https://admin.yeeted.lol/settings/profile
   ```
   Tell the user to scroll to the **API/CLI** section and generate or copy their API token.

2. Once they have the token, authenticate:
   ```bash
   dokploy authenticate -u https://admin.yeeted.lol -t <token>
   ```

3. Verify it works:
   ```bash
   dokploy verify
   ```

Alternatively, auth can be set via environment variables (useful for CI or env-based config):
```bash
export DOKPLOY_URL=https://admin.yeeted.lol
export DOKPLOY_AUTH_TOKEN=<token>
```

The CLI checks env vars first, then falls back to `config.json`.

### Discovering IDs (Critical for Non-Interactive Use)

The CLI commands need IDs (projectId, environmentId, applicationId, etc.) to run non-interactively. Use these commands to discover IDs:

```bash
# List all projects with their IDs
dokploy project list
# Output table: #, Project ID, Name, Description

# Get full project details including all environment, app, and database IDs
dokploy project info -p <projectId>
# Output includes:
#   Project ID: <projectId>
#   Environment 1: staging (description)
#     Environment ID: <environmentId>
#     Applications:
#       1. my-app (ID: <applicationId>)
#     Compose Services:
#       1. my-compose (ID: <composeId>)
#     PostgreSQL Databases:
#       1. my-db (ID: <postgresId>)
#     (same for mysql, mariadb, mongo, redis)
```

### Projects

```bash
dokploy project list                                    # Table: #, Project ID, Name, Description
dokploy project info -p <projectId>                     # Full details with all IDs (environments, apps, databases)
dokploy project create -n "Name" -d "Description" -y    # Create project
```

**Flags for `project create`:**
| Flag | Short | Required for non-interactive | Description |
|------|-------|------------------------------|-------------|
| `--name` | `-n` | Yes | Project name |
| `--description` | `-d` | No | Project description |
| `--skipConfirm` | `-y` | Yes | Skip confirmation |

**Flags for `project info`:**
| Flag | Short | Required for non-interactive | Description |
|------|-------|------------------------------|-------------|
| `--projectId` | `-p` | Yes | Project ID |

### Environments

```bash
dokploy environment create -p <projectId> -n "staging" -d "Staging env" -y
dokploy environment delete -p <projectId> -e <environmentId> -y
```

**Flags for `environment create`:**
| Flag | Short | Required for non-interactive | Description |
|------|-------|------------------------------|-------------|
| `--projectId` | `-p` | Yes | Project ID |
| `--name` | `-n` | Yes | Environment name |
| `--description` | `-d` | No | Environment description |
| `--skipConfirm` | `-y` | Yes | Skip confirmation |

**Flags for `environment delete`:**
| Flag | Short | Required for non-interactive | Description |
|------|-------|------------------------------|-------------|
| `--projectId` | `-p` | Yes | Project ID |
| `--environmentId` | `-e` | Yes | Environment ID |
| `--skipConfirm` | `-y` | Yes | Skip confirmation |

### Applications

```bash
dokploy app create -p <projectId> -e <environmentId> -n "Name" --appName <docker-name> -y
dokploy app deploy -p <projectId> -e <environmentId> -a <applicationId> -y
dokploy app stop -p <projectId> -e <environmentId> -a <applicationId> -y
dokploy app delete -p <projectId> -e <environmentId> -a <applicationId> -y
```

**Flags for `app create`:**
| Flag | Short | Required for non-interactive | Description |
|------|-------|------------------------------|-------------|
| `--projectId` | `-p` | Yes | Project ID |
| `--environmentId` | `-e` | Yes | Environment ID |
| `--name` | `-n` | Yes | Application name |
| `--description` | `-d` | No | Application description |
| `--appName` | — | Yes | Docker container name (slug) |
| `--skipConfirm` | `-y` | Yes | Skip confirmation |

**Flags for `app deploy` / `app stop` / `app delete`:**
| Flag | Short | Required for non-interactive | Description |
|------|-------|------------------------------|-------------|
| `--projectId` | `-p` | Yes | Project ID |
| `--environmentId` | `-e` | Yes | Environment ID |
| `--applicationId` | `-a` | Yes | Application ID |
| `--skipConfirm` | `-y` | Yes | Skip confirmation |

### Compose Services

```bash
dokploy compose create -p <projectId> -e <environmentId> -n "Name" --appName <docker-name> -y
dokploy compose deploy -p <projectId> -e <environmentId> -c <composeId> -y
dokploy compose stop -p <projectId> -e <environmentId> -c <composeId> -y
dokploy compose delete -p <projectId> -e <environmentId> -c <composeId> -y
dokploy compose delete -p <projectId> -e <environmentId> -c <composeId> --deleteVolumes -y

# Configure deployment source (git, github, gitlab, bitbucket, gitea, raw)
dokploy compose source -c <composeId> --sourceType git --customGitUrl git@gitea.yeeted.lol:Org/repo.git --customGitBranch main -y
dokploy compose source -c <composeId> --sourceType gitea --giteaRepository my-repo --giteaOwner MyOrg --giteaBranch main --giteaId <id> -y
dokploy compose source -c <composeId> --sourceType github --repository my-repo --owner my-org --branch main --githubId <id> -y
dokploy compose source -c <composeId> --sourceType raw -y
```

**Flags for `compose create`:**
| Flag | Short | Required for non-interactive | Description |
|------|-------|------------------------------|-------------|
| `--projectId` | `-p` | Yes | Project ID |
| `--environmentId` | `-e` | Yes | Environment ID |
| `--name` | `-n` | Yes | Compose service name |
| `--description` | `-d` | No | Description |
| `--appName` | — | Yes | Docker app name (slug) |
| `--composeType` | — | No | `docker-compose` (default) or `stack` |
| `--skipConfirm` | `-y` | Yes | Skip confirmation |

**Flags for `compose deploy` / `compose stop`:**
| Flag | Short | Required for non-interactive | Description |
|------|-------|------------------------------|-------------|
| `--projectId` | `-p` | Yes | Project ID |
| `--environmentId` | `-e` | Yes | Environment ID |
| `--composeId` | `-c` | Yes | Compose service ID |
| `--skipConfirm` | `-y` | Yes | Skip confirmation |

**Flags for `compose delete`:**
| Flag | Short | Required for non-interactive | Description |
|------|-------|------------------------------|-------------|
| `--projectId` | `-p` | Yes | Project ID |
| `--environmentId` | `-e` | Yes | Environment ID |
| `--composeId` | `-c` | Yes | Compose service ID |
| `--deleteVolumes` | — | No | Also delete associated volumes |
| `--skipConfirm` | `-y` | Yes | Skip confirmation |

**Flags for `compose source`:**
| Flag | Short | Required for non-interactive | Description |
|------|-------|------------------------------|-------------|
| `--composeId` | `-c` | Yes | Compose service ID |
| `--sourceType` | `-s` | Yes | Source type: `git`, `github`, `gitlab`, `bitbucket`, `gitea`, `raw` |
| `--skipConfirm` | `-y` | Yes | Skip confirmation |

Source-type-specific flags (provide the ones matching your `--sourceType`):

| Flag | Source Type | Description |
|------|------------|-------------|
| `--customGitUrl` | git | Git repository URL (e.g., `git@gitea.yeeted.lol:Org/repo.git`) |
| `--customGitBranch` | git | Branch name |
| `--customGitSSHKeyId` | git | SSH key ID for authentication |
| `--repository` | github | Repository name |
| `--owner` | github | Repository owner |
| `--branch` | github | Branch name |
| `--githubId` | github | GitHub integration ID |
| `--gitlabRepository` | gitlab | Repository name |
| `--gitlabOwner` | gitlab | Repository owner |
| `--gitlabBranch` | gitlab | Branch name |
| `--gitlabProjectId` | gitlab | GitLab project ID |
| `--gitlabId` | gitlab | GitLab integration ID |
| `--bitbucketRepository` | bitbucket | Repository name |
| `--bitbucketOwner` | bitbucket | Repository owner |
| `--bitbucketBranch` | bitbucket | Branch name |
| `--bitbucketId` | bitbucket | Bitbucket integration ID |
| `--giteaRepository` | gitea | Repository name |
| `--giteaOwner` | gitea | Repository owner |
| `--giteaBranch` | gitea | Branch name |
| `--giteaId` | gitea | Gitea integration ID |

Common optional flags (all source types):

| Flag | Description |
|------|-------------|
| `--composePath` | Path to compose file (default: `./docker-compose.yml`) |
| `--[no-]autoDeploy` | Enable/disable auto-deploy on push |

### Environment Variables

```bash
# Pull remote env vars to local file
dokploy env pull .env.local -p <projectId> -e <environmentId> -a <applicationId> -y
dokploy env pull .env.local -p <projectId> -e <environmentId> -c <composeId> -y

# Push local env file to remote service
dokploy env push .env.local -a <applicationId> -y
dokploy env push .env.local -c <composeId> -y
```

**Flags for `env pull`:**
| Flag | Short | Required for non-interactive | Description |
|------|-------|------------------------------|-------------|
| `--projectId` | `-p` | Yes (with -a/-c) | Project ID |
| `--environmentId` | `-e` | Yes (with -a/-c) | Environment ID |
| `--applicationId` | `-a` | One of -a/-c | Application ID |
| `--composeId` | `-c` | One of -a/-c | Compose service ID |
| `--skipConfirm` | `-y` | Yes | Skip file override confirmation |

**Flags for `env push`:**
| Flag | Short | Required for non-interactive | Description |
|------|-------|------------------------------|-------------|
| `--applicationId` | `-a` | One of -a/-c | Application ID (no projectId/environmentId needed) |
| `--composeId` | `-c` | One of -a/-c | Compose service ID |
| `--skipConfirm` | `-y` | Yes | Skip destructive override confirmation |

### Databases

All database types follow the same pattern: `dokploy database <type> <action>`

**Types:** `postgres`, `mysql`, `mariadb`, `mongo`, `redis`
**Actions:** `create`, `deploy`, `stop`, `delete`

```bash
# Create (all flags required for non-interactive)
dokploy database postgres create \
  -p <projectId> -e <environmentId> \
  -n "My DB" --databaseName mydb --databasePassword secret \
  --appName my-db -y

# Deploy / Stop / Delete (same flags pattern)
dokploy database postgres deploy -p <projectId> -e <environmentId> --postgresId <id> -y
dokploy database postgres stop   -p <projectId> -e <environmentId> --postgresId <id> -y
dokploy database postgres delete -p <projectId> -e <environmentId> --postgresId <id> -y
```

**Flags for `database <type> create`:**
| Flag | Short | Required | Description | Default |
|------|-------|----------|-------------|---------|
| `--projectId` | `-p` | Yes | Project ID | — |
| `--environmentId` | `-e` | Yes | Environment ID | — |
| `--name` | `-n` | Yes | Instance name | — |
| `--databaseName` | — | Yes (not redis) | Database name | — |
| `--databasePassword` | — | Yes | Database password | — |
| `--appName` | — | Yes | Docker container name | — |
| `--description` | `-d` | No | Description | — |
| `--dockerImage` | — | No | Docker image | varies by type |
| `--databaseUser` | — | No | Database user | varies by type |
| `--databaseRootPassword` | — | mysql/mariadb only | Root password | — |
| `--skipConfirm` | `-y` | Yes | Skip confirmation | — |

**Default docker images:** postgres:15, mysql:8, mariadb:11, mongo:6, redis:7
**Default users:** postgres, mysql, mariadb, mongo

**Flags for `database <type> deploy/stop/delete`:**
| Flag | Short | Required | Description |
|------|-------|----------|-------------|
| `--projectId` | `-p` | Yes | Project ID |
| `--environmentId` | `-e` | Yes | Environment ID |
| `--<type>Id` | varies | Yes | Instance ID (e.g., `--postgresId`, `--mysqlId`, `--mariadbId`, `--mongoId`, `--redisId`) |
| `--skipConfirm` | `-y` | Yes | Skip confirmation |

**Short flags for database instance IDs:**
- postgres: `--postgresId` / `-d`
- mysql delete/stop: `--mysqlId` / `-i`, mysql deploy: `--mysqlId` / `-m`
- mariadb: `--mariadbId` / `-m`
- mongo: `--mongoId` / `-m`
- redis: `--redisId` / `-r`

## Typical Workflow (Non-Interactive)

```bash
# 1. List projects — read projectId from the table output
dokploy project list

# 2. Create a project (if needed)
dokploy project create -n "My Service" -d "Production service" -y

# 3. Get all IDs for a project — read environmentId, applicationId, etc. from output
dokploy project info -p <projectId>

# 4. Create an environment
dokploy environment create -p <projectId> -n "production" -d "Production" -y

# 5. Re-run project info to get the new environmentId
dokploy project info -p <projectId>

# 6. Create an application
dokploy app create -p <projectId> -e <environmentId> -n "api" --appName api-service -y

# 7. Re-run project info to get the new applicationId
dokploy project info -p <projectId>

# 8. Push env vars
dokploy env push .env.production -a <applicationId> -y

# 9. Deploy
dokploy app deploy -p <projectId> -e <environmentId> -a <applicationId> -y
```

## Docker Compose Conventions

All Dokploy projects use Docker Compose. Follow these rules strictly:

### Networking

- **NEVER** use `ports:` to bind host ports. Use `expose:` instead. Dokploy handles routing via Traefik.
- **ALWAYS** attach to the `dokploy-network` external network.

```yaml
services:
  app:
    build: .
    expose:
      - "3000"
    networks:
      - dokploy-network

networks:
  dokploy-network:
    external: true
```

### Multi-service example

```yaml
services:
  api:
    build: .
    expose:
      - "8080"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/mydb
    networks:
      - dokploy-network

  db:
    image: postgres:16
    expose:
      - "5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - dokploy-network

volumes:
  pgdata:

networks:
  dokploy-network:
    external: true
```

### Key rules

- Services communicate via service name on `dokploy-network` (e.g., `http://api:8080`)
- Traefik labels or Dokploy domain config handle external access - do not expose ports to host
- Use named volumes for persistence

## Repository Setup (Gitea)

All Dokploy projects use Gitea repos at `gitea.yeeted.lol`. The `tea` CLI is pre-authenticated.

### Create a new repo and configure for Dokploy

```bash
# Create repo under an org (e.g., Shopped)
tea repo create --name my-service --owner Shopped --private

# Or under personal account
tea repo create --name my-service --private
```

### Configure deployment source via CLI

After creating a compose service, configure its source to deploy from a Gitea repo:

```bash
# Set source to a Gitea repository
dokploy compose source -c <composeId> \
  --sourceType git \
  --customGitUrl git@gitea.yeeted.lol:<owner>/<repo>.git \
  --customGitBranch main \
  --composePath ./docker-compose.yml \
  -y

# Or set to raw (inline compose file, no git source)
dokploy compose source -c <composeId> --sourceType raw -y
```

### Dokploy app configuration (dashboard alternative)

When configuring an application in Dokploy (via dashboard):

- **Source**: Git repository
- **Repository URL**: `git@gitea.yeeted.lol:<owner>/<repo>.git` (SSH format)
- **Branch**: `main`
- **Build type**: Docker Compose
- **Compose path**: `docker-compose.yml` (or `compose.yml`)
