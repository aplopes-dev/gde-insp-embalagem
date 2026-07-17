import {
  isSafePathSegment,
  resolvePathInsideRoot,
  sanitizeImageLocation,
} from "./image-path-safety";

describe("image-path-safety", () => {
  it("rejects traversal segments", () => {
    expect(isSafePathSegment("..")).toBe(false);
    expect(isSafePathSegment(".")).toBe(false);
    expect(isSafePathSegment("2026-07-17")).toBe(true);
  });

  it("rejects path traversal in resourcePath", () => {
    expect(
      sanitizeImageLocation("../etc", "OP_1_BOX_a_BL_b.jpg")
    ).toBeNull();
    expect(
      sanitizeImageLocation("2026-07-17/../../etc", "OP_1_BOX_a_BL_b.jpg")
    ).toBeNull();
  });

  it("rejects unsafe filenames", () => {
    expect(sanitizeImageLocation("2026-07-17", "../secret.jpg")).toBeNull();
    expect(sanitizeImageLocation("2026-07-17", "a/b.jpg")).toBeNull();
  });

  it("accepts normal inspection image keys", () => {
    expect(
      sanitizeImageLocation("2026-07-17", "OP_123_BOX_clxyz_BL_QR001.jpg")
    ).toEqual({
      pathSegments: ["2026-07-17"],
      filename: "OP_123_BOX_clxyz_BL_QR001.jpg",
    });
  });

  it("jails resolved paths under root", () => {
    const root = "/data/gde/logs";
    expect(
      resolvePathInsideRoot(root, ["2026-07-17"], "OP_1.jpg")
    ).toBe("/data/gde/logs/2026-07-17/OP_1.jpg");
    // path.resolve would escape without jail check
    expect(resolvePathInsideRoot(root, [".."], "secret.jpg")).toBeNull();
  });
});
