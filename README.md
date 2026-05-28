# AI Refactor Playbook Runner

A markdown-driven playbook runner for repeatable, safe codebase-wide refactors.

## Status
Scaffold

## Why this exists
AI makes refactors cheap. The point is to turn that into a repeatable cleanup loop instead of letting tech debt accumulate.

## Core idea
- Read markdown playbooks
- Expand placeholders
- Execute step by step
- Support retries and timeouts
- Resume interrupted runs

## Build order
1. Markdown schema and inheritance
2. Placeholder interpolation
3. Execution and reporting
4. Dry-run and resume
5. Examples and tests

## Included
- Reusable markdown specs
- Inheritance merge behavior
- Clear timeout reporting
- Deterministic execution

## Excluded
- General-purpose workflow engine
- Full IDE integration
- Monorepo orchestration
- Production deployment pipeline
