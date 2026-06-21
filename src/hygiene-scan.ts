import { basename, join } from "node:path";
import type { HygieneFinding, HygieneReport } from "./hygiene-types.js";
import {
  classifyCommitStyle,
  collectCommitSubjects,
  countBuckets,
  exists,
  listMarkdownFiles,
  makeFinding,
  readPackageScripts,
} from "./hygiene-checks.js";

export { classifyCommitStyle } from "./hygiene-checks.js";

function repoNameFromPath(repoPath: string): string {
  return basename(repoPath) || repoPath;
}

function scoreFindings(findings: HygieneFinding[]): number {
  return Math.max(
    0,
    100 -
      findings.reduce((total, finding) => {
        if (finding.bucket === "fix now") return total + 18;
        if (finding.bucket === "warning") return total + 8;
        return total;
      }, 0),
  );
}

export async function scanRepository(repoPath: string): Promise<HygieneReport> {
  const findings: HygieneFinding[] = [];

  const readmeExists = await exists(join(repoPath, "README.md"));
  const agentsExists = await exists(join(repoPath, "AGENTS.md"));
  const claudeExists = await exists(join(repoPath, "CLAUDE.md"));
  const changelogExists =
    (await exists(join(repoPath, "CHANGELOG.md"))) ||
    (await exists(join(repoPath, "docs", "changelog.md")));
  const docsMarkdown = await listMarkdownFiles(join(repoPath, "docs"), 1);
  const packageScripts = await readPackageScripts(repoPath);
  const commitSubjects = collectCommitSubjects(repoPath);

  findings.push(
    readmeExists
      ? makeFinding(
          "readme-present",
          "good",
          "README exists",
          "The repo has a top-level README for quick orientation.",
        )
      : makeFinding(
          "readme-missing",
          "fix now",
          "README is missing",
          "Add a top-level README so agents and humans have an obvious starting point.",
        ),
  );

  findings.push(
    agentsExists || claudeExists
      ? makeFinding(
          "agent-doc-present",
          "good",
          "Agent instructions exist",
          "Found repo-level instructions for agent onboarding.",
        )
      : makeFinding(
          "agent-doc-missing",
          "fix now",
          "Agent instructions are missing",
          "Add AGENTS.md or CLAUDE.md so automation knows the house rules.",
        ),
  );

  findings.push(
    docsMarkdown.length > 0
      ? makeFinding(
          "docs-shape-present",
          "good",
          "Docs directory is navigable",
          `Found ${String(docsMarkdown.length)} Markdown doc(s) under docs/.`,
        )
      : makeFinding(
          "docs-shape-missing",
          "warning",
          "Docs directory is thin",
          "Add a small docs/ tree or module notes so the repo is easier to navigate.",
        ),
  );

  findings.push(
    changelogExists
      ? makeFinding(
          "changelog-present",
          "good",
          "Changelog or release notes exist",
          "The repo has a visible change log path for updates.",
        )
      : makeFinding(
          "changelog-missing",
          "warning",
          "No changelog found",
          "Add CHANGELOG.md or another update log if dependency churn matters here.",
        ),
  );

  if (packageScripts.length > 0) {
    const scriptSet = new Set(packageScripts);
    const coverage = ["build", "test", "lint", "ci"].filter((s) =>
      scriptSet.has(s),
    ).length;

    findings.push(
      coverage >= 3
        ? makeFinding(
            "package-scripts-good",
            "good",
            "Package scripts are predictable",
            `Found ${String(coverage)} of the expected build/test/lint/ci scripts.`,
          )
        : makeFinding(
            "package-scripts-missing",
            "warning",
            "Package scripts are sparse",
            "Add the standard build/test/lint/ci scripts so the repo is easier to automate.",
          ),
    );
  } else {
    findings.push(
      makeFinding(
        "package-json-missing",
        "warning",
        "No package scripts detected",
        "This repo may not be a Node project, or package.json is missing useful scripts.",
      ),
    );
  }

  findings.push(...classifyCommitStyle(commitSubjects).findings);

  const entrypointExists =
    (await exists(join(repoPath, "src", "index.ts"))) ||
    (await exists(join(repoPath, "index.ts"))) ||
    (await exists(join(repoPath, "main.ts")));

  findings.push(
    entrypointExists
      ? makeFinding(
          "entrypoint-present",
          "good",
          "An obvious entrypoint exists",
          "Found a clear code entrypoint for navigation.",
        )
      : makeFinding(
          "entrypoint-missing",
          "warning",
          "Entry point is not obvious",
          "Add an obvious entrypoint or document where the main surface lives.",
        ),
  );

  return {
    repoPath,
    repoName: repoNameFromPath(repoPath),
    scannedAt: new Date().toISOString(),
    score: scoreFindings(findings),
    counts: countBuckets(findings),
    findings,
  };
}
