import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const STATIC = join(__dirname, "..", "static");
const LOADER = "https://hammantlabs.com/a.js";
const HOST_GUARD = "/(^|\\.)boothub\\.dev$/.test(location.hostname)";

describe("page-view loader", () => {
  it.each(["index.html", "about.html"])("is on the public page %s, behind the host guard", (page) => {
    // Arrange
    const html = readFileSync(join(STATIC, page), "utf8");

    // Act
    const loaderAt = html.indexOf(LOADER);
    const guardAt = html.indexOf(HOST_GUARD);

    // Assert
    expect(loaderAt).toBeGreaterThan(-1);
    expect(guardAt).toBeGreaterThan(-1);
    expect(guardAt).toBeLessThan(loaderAt);
  });

  it("is on no page under /app, where claim keys and tokens are handled", () => {
    // Arrange
    const appDir = join(STATIC, "app");
    const pages = readdirSync(appDir).filter((name) => name.endsWith(".html"));

    // Act
    const withLoader = pages.filter((name) => readFileSync(join(appDir, name), "utf8").includes("hammantlabs.com"));

    // Assert
    expect(pages.length).toBeGreaterThan(0);
    expect(withLoader).toEqual([]);
  });
});
