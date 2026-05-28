import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parsePlaybookMarkdown, runPlaybook } from "../src/index.js";

const playbookMarkdown = `# Refactor api client

## Objective
Make the API client deterministic.

## Variables
- repo_root: /repo

## Steps
1. First step
   - command: npm run first
   - cwd: {{repo_root}}
   - retries: 1
   - timeout_seconds: 30
2. Second step
   - command: npm run second
   - cwd: {{repo_root}}
   - retries: 0
   - timeout_seconds: 30
`;

describe("runPlaybook", () => {
  it("retries failed steps and persists resume state", async () => {
    const root = await mkdtemp(join(tmpdir(), "playbook-runner-"));
    const statePath = join(root, "state.json");
    const playbook = parsePlaybookMarkdown(playbookMarkdown, {
      sourcePath: "/repo/playbooks/refactor.md",
    });

    const calls: Array<string> = [];
    const firstRun = await runPlaybook(playbook, {
      cwd: "/Users/olegkoval/projects/app",
      statePath,
      variables: { repo_root: "/Users/olegkoval/projects/app" },
      executor: async (command) => {
        calls.push(command);
        if (calls.length < 2) {
          return {
            exitCode: 1,
            stdout: "",
            stderr: "boom",
          };
        }

        return {
          exitCode: 0,
          stdout: "ok",
          stderr: "",
        };
      },
    });

    expect(firstRun.status).toBe("failed");
    expect(firstRun.steps[0].attempts).toBe(2);
    expect(firstRun.steps[0].finalStatus).toBe("succeeded");
    expect(firstRun.steps[1].finalStatus).toBe("skipped");
    expect(await readFile(statePath, "utf8")).toContain("\"lastCompletedStepIndex\":0");

    const resumedCalls: Array<string> = [];
    const resumed = await runPlaybook(playbook, {
      cwd: "/Users/olegkoval/projects/app",
      statePath,
      resume: true,
      variables: { repo_root: "/Users/olegkoval/projects/app" },
      executor: async (command) => {
        resumedCalls.push(command);
        return {
          exitCode: 0,
          stdout: "ok",
          stderr: "",
        };
      },
    });

    expect(resumed.status).toBe("succeeded");
    expect(resumedCalls).toEqual(["npm run second"]);
    await rm(root, { recursive: true, force: true });
  });

  it("supports dry-run without executing commands", async () => {
    const playbook = parsePlaybookMarkdown(playbookMarkdown, {
      sourcePath: "/repo/playbooks/refactor.md",
    });

    const result = await runPlaybook(playbook, {
      cwd: "/Users/olegkoval/projects/app",
      dryRun: true,
      variables: { repo_root: "/Users/olegkoval/projects/app" },
      executor: async () => {
        throw new Error("should not execute");
      },
    });

    expect(result.status).toBe("dry-run");
    expect(result.steps[0].finalStatus).toBe("planned");
    expect(result.steps[1].finalStatus).toBe("planned");
  });

  it("reports timeouts with step context", async () => {
    const playbook = parsePlaybookMarkdown(playbookMarkdown, {
      sourcePath: "/repo/playbooks/refactor.md",
    });

    const result = await runPlaybook(playbook, {
      cwd: "/Users/olegkoval/projects/app",
      variables: { repo_root: "/Users/olegkoval/projects/app" },
      executor: async () => new Promise(() => {
        // never settles
      }),
    });

    expect(result.status).toBe("failed");
    expect(result.steps[0].finalStatus).toBe("timed_out");
    expect(result.steps[0].error).toContain("First step");
    expect(result.steps[0].error).toContain("timeout");
  });
});
