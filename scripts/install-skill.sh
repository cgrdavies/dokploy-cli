#!/usr/bin/env bash
# Installs the dokploy Claude Code skill to ~/.claude/skills/dokploy/
# Run automatically via npm postinstall, or manually: bash scripts/install-skill.sh

SKILL_DIR="$HOME/.claude/skills/dokploy"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_SKILL="$SCRIPT_DIR/../.claude/skills/dokploy/SKILL.md"

if [ ! -f "$REPO_SKILL" ]; then
  echo "dokploy skill: SKILL.md not found in repo, skipping"
  exit 0
fi

mkdir -p "$SKILL_DIR"
cp "$REPO_SKILL" "$SKILL_DIR/SKILL.md"
echo "dokploy skill installed to $SKILL_DIR/SKILL.md"
