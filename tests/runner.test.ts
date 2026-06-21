import { describe, expect, it } from "vitest";
import { classifyCommitStyle } from "../src/index.js";

describe("classifyCommitStyle", () => {
  it("marks strongly conventional history as good", () => {
    const result = classifyCommitStyle([
      "feat: add scanner",
      "fix: handle docs",
      "chore: tidy",
    ]);
    expect(result.ratio).toBe(1);
    expect(result.findings[0]?.bucket).toBe("good");
  });

  it("downgrades vague history", () => {
    const result = classifyCommitStyle([
      "update stuff",
      "more changes",
      "random",
    ]);
    expect(result.ratio).toBe(0);
    expect(result.findings[0]?.bucket).toBe("fix now");
  });
});
