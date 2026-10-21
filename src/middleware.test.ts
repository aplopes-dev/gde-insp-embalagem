/** @jest-environment node */
import { NextRequest } from "next/server";

jest.mock("next-auth/jwt", () => ({ getToken: jest.fn() }));

import { getToken } from "next-auth/jwt";
import { middleware } from "./middleware";

const getTokenMock = getToken as jest.Mock;

describe("middleware — cookie da ponte WebSocket local (?ws=)", () => {
  it("grava o cookie já no redirect para o login (o ?ws= fica só no callbackUrl)", async () => {
    getTokenMock.mockResolvedValue(null);
    const res = await middleware(
      new NextRequest("http://172.30.40.27:3014/?deviceId=realwear_03&ws=http%3A%2F%2F192.168.3.4%3A3012")
    );
    expect(res.headers.get("location")).toContain("/login");
    expect(res.cookies.get("gde_socket_url")?.value).toBe("http://192.168.3.4:3012");
  });

  it("grava o cookie com sessão iniciada", async () => {
    getTokenMock.mockResolvedValue({ role: "OPERATOR" });
    const res = await middleware(
      new NextRequest("http://172.30.40.27:3014/?deviceId=realwear_04&ws=http://192.168.3.4:3012")
    );
    expect(res.cookies.get("gde_socket_url")?.value).toBe("http://192.168.3.4:3012");
  });

  it("?ws= vazio apaga o cookie; sem ?ws= não mexe", async () => {
    getTokenMock.mockResolvedValue({ role: "OPERATOR" });
    const cleared = await middleware(new NextRequest("http://172.30.40.27:3014/?deviceId=realwear_04&ws="));
    expect(cleared.cookies.get("gde_socket_url")?.value).toBe("");

    const untouched = await middleware(new NextRequest("http://172.30.40.27:3014/?deviceId=realwear_04"));
    expect(untouched.cookies.get("gde_socket_url")).toBeUndefined();
  });
});
