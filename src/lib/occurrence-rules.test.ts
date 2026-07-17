import {
  AUTO_OCCURRENCE_THRESHOLD,
  DETECTION_DEBOUNCE_MS,
  buildDetectionDebounceKey,
  shouldOpenOccurrence,
  shouldPersistDetection,
} from "./occurrence-rules";

describe("occurrence-rules", () => {
  it("exposes approved constants", () => {
    expect(DETECTION_DEBOUNCE_MS).toBe(2500);
    expect(AUTO_OCCURRENCE_THRESHOLD).toBe(3);
  });

  it("builds stable debounce keys", () => {
    expect(
      buildDetectionDebounceKey({
        opId: 10,
        boxId: "box-1",
        step: "blister",
        status: "INVALID",
      })
    ).toBe("10|box-1|blister|INVALID");
  });

  it("persists when no previous event", () => {
    expect(shouldPersistDetection(null, 1000)).toBe(true);
  });

  it("skips within debounce window", () => {
    expect(shouldPersistDetection(1000, 2000, 2500)).toBe(false);
  });

  it("persists after debounce window", () => {
    expect(shouldPersistDetection(1000, 4000, 2500)).toBe(true);
  });

  it("opens occurrence at threshold", () => {
    expect(shouldOpenOccurrence(2)).toBe(false);
    expect(shouldOpenOccurrence(3)).toBe(true);
    expect(shouldOpenOccurrence(4)).toBe(true);
  });
});
