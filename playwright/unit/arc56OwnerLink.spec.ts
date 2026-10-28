// Node-only unit tests for the ARC-56 owner link (AW-2026-095).
import { test, expect } from "@playwright/test";
import { ownerHref } from "../../src/scripts/arc56/ownerLink";

const base = { owner: "algo-dev", repo: "my-app" };

test.describe("ownerHref", () => {
  test("keeps a github.com URL", () => {
    expect(ownerHref({ ...base, url: "https://github.com/algo-dev/my-app" })).toBe(
      "https://github.com/algo-dev/my-app",
    );
  });

  test("never lets a script, data or foreign URL through", () => {
    for (const url of [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "data:text/html,<script>1</script>",
      "http://github.com/algo-dev/my-app",
      "https://github.com.evil.example/algo-dev/my-app",
      "https://evil.example/github.com/algo-dev/my-app",
      "https://user:pass@github.com/algo-dev/my-app",
      "",
      "not a url",
    ]) {
      expect(ownerHref({ ...base, url })).toBe("https://github.com/algo-dev/my-app");
    }
    expect(ownerHref(base)).toBe("https://github.com/algo-dev/my-app");
  });

  test("encodes the names it rebuilds the link from", () => {
    expect(ownerHref({ owner: "a/b", repo: "c d?", url: "javascript:1" })).toBe(
      "https://github.com/a%2Fb/c%20d%3F",
    );
  });
});
