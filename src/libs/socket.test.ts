/** @jest-environment jsdom */

import { resolveSocketUrl } from "./socket";

describe("resolveSocketUrl", () => {
  const originalLocation = window.location;

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("usa o hostname da página, não um IP embutido no env", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        protocol: "http:",
        hostname: "192.168.1.2",
      },
    });

    expect(resolveSocketUrl()).toBe("http://192.168.1.2:3012");
  });
});
