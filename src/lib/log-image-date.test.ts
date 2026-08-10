import {
  formatLogImageDatePath,
  logImageDatePathCandidates,
  shiftYmd,
} from "./log-image-date";

describe("log-image-date", () => {
  it("formats packedAt near midnight BRT as local calendar day (not UTC)", () => {
    // 2026-08-10 02:27 UTC = 2026-08-09 23:27 America/Sao_Paulo
    expect(formatLogImageDatePath("2026-08-10T02:27:59.258Z")).toBe(
      "2026-08-09"
    );
    // 2026-08-07 01:20 UTC = 2026-08-06 22:20 America/Sao_Paulo
    expect(formatLogImageDatePath("2026-08-07T01:20:25.279Z")).toBe(
      "2026-08-06"
    );
  });

  it("keeps same calendar day for daytime BRT timestamps", () => {
    // 2026-08-06 17:10 UTC = 2026-08-06 14:10 BRT
    expect(formatLogImageDatePath("2026-08-06T17:10:10.210Z")).toBe(
      "2026-08-06"
    );
  });

  it("builds ±1 day candidates", () => {
    expect(logImageDatePathCandidates("2026-08-10")).toEqual([
      "2026-08-10",
      "2026-08-09",
      "2026-08-11",
    ]);
    expect(shiftYmd("2026-01-01", -1)).toBe("2025-12-31");
  });
});
