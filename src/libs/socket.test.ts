/** @jest-environment jsdom */

import {
  SocketUrlStore,
  cookieSocketUrlStore,
  rememberSocketUrlFromQuery,
  resolveSocketUrl,
  socketUrlOverride,
} from "./socket";

function clearCookie() {
  document.cookie = "gde_socket_url=; path=/; max-age=0";
}

function setLocation(value: Partial<Location>) {
  Object.defineProperty(window, "location", { configurable: true, value });
}

describe("resolveSocketUrl", () => {
  const originalLocation = window.location;

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
    clearCookie();
  });

  it("?ws= liga o browser à ponte local e vale nas páginas seguintes", () => {
    setLocation({
      protocol: "http:",
      hostname: "172.30.40.27",
      search: "?deviceId=realwear_03&ws=http://192.168.3.4:3012",
    });
    expect(resolveSocketUrl()).toBe("http://192.168.3.4:3012");

    setLocation({ protocol: "http:", hostname: "172.30.40.27", search: "?deviceId=realwear_03" });
    expect(resolveSocketUrl()).toBe("http://192.168.3.4:3012");
  });

  it("usa o cookie gravado pelo middleware (tela aberta depois do login)", () => {
    document.cookie = `gde_socket_url=${encodeURIComponent("http://192.168.3.4:3012")}; path=/`;
    setLocation({ protocol: "http:", hostname: "172.30.40.27", search: "?deviceId=realwear_04" });
    expect(resolveSocketUrl()).toBe("http://192.168.3.4:3012");
  });

  it("usa o hostname da página, não um IP embutido no env", () => {
    setLocation({ protocol: "http:", hostname: "192.168.1.2" });
    expect(resolveSocketUrl()).toBe("http://192.168.1.2:3012");
  });
});

describe("socketUrlOverride", () => {
  afterEach(clearCookie);

  function memoryStore(initial: string | null = null): SocketUrlStore & { value: string | null } {
    return {
      value: initial,
      get() { return this.value; },
      set(origin) { this.value = origin; },
      clear() { this.value = null; },
    };
  }

  it("?ws= vazio apaga o valor guardado", () => {
    const store = memoryStore("http://192.168.3.4:3012");
    expect(socketUrlOverride("?ws=", store)).toBeNull();
    expect(store.value).toBeNull();
  });

  it("ignora esquemas que não sejam http(s)", () => {
    expect(socketUrlOverride("?ws=javascript:alert(1)", memoryStore())).toBeNull();
  });

  it("guarda só a origem", () => {
    const store = memoryStore();
    expect(socketUrlOverride("?ws=http://192.168.3.4:3012/x?y=1", store)).toBe(
      "http://192.168.3.4:3012"
    );
    expect(store.value).toBe("http://192.168.3.4:3012");
  });

  it("rememberSocketUrlFromQuery grava no cookie; página sem ?ws= não o apaga", () => {
    rememberSocketUrlFromQuery("?deviceId=realwear_03&ws=http%3A%2F%2F192.168.3.4%3A3012");
    rememberSocketUrlFromQuery("?deviceId=realwear_03");
    expect(cookieSocketUrlStore.get()).toBe("http://192.168.3.4:3012");
  });
});
