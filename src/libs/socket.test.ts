/** @jest-environment jsdom */

import { resolveSocketUrl, socketUrlOverride } from "./socket";

describe("resolveSocketUrl", () => {
  const originalLocation = window.location;

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
    window.sessionStorage.clear();
  });

  it("?ws= liga o separador à ponte local e fica guardado ao navegar", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        protocol: "http:",
        hostname: "172.30.40.27",
        search: "?deviceId=realwear_03&ws=http://192.168.3.4:3012",
      },
    });
    expect(resolveSocketUrl()).toBe("http://192.168.3.4:3012");

    Object.defineProperty(window, "location", {
      configurable: true,
      value: { protocol: "http:", hostname: "172.30.40.27", search: "?deviceId=realwear_03" },
    });
    expect(resolveSocketUrl()).toBe("http://192.168.3.4:3012");
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

describe("socketUrlOverride", () => {
  afterEach(() => window.sessionStorage.clear());

  it("?ws= vazio apaga o valor guardado", () => {
    window.sessionStorage.setItem("gde.socketUrl", "http://192.168.3.4:3012");
    expect(socketUrlOverride("?ws=", window.sessionStorage)).toBeNull();
    expect(window.sessionStorage.getItem("gde.socketUrl")).toBeNull();
  });

  it("ignora esquemas que não sejam http(s)", () => {
    expect(socketUrlOverride("?ws=javascript:alert(1)", window.sessionStorage)).toBeNull();
  });

  it("guarda só a origem", () => {
    expect(socketUrlOverride("?ws=http://192.168.3.4:3012/x?y=1", window.sessionStorage)).toBe(
      "http://192.168.3.4:3012"
    );
  });
});
