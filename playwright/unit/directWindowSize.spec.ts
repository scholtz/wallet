// Node-only unit tests for enlarging a small Biatec Direct popup.
import { test, expect } from "@playwright/test";
import { enlargedPopupGeometry } from "../../src/scripts/direct/windowSize";

const small = { width: 480, height: 720 };

test("a 480x720 popup on a full-HD screen becomes 1100x860, centred", () => {
  expect(enlargedPopupGeometry({ width: 1920, height: 1040, left: 0, top: 0 }, small)).toEqual({
    width: 1100,
    height: 860,
    left: 410,
    top: 90,
  });
});

test("a small laptop screen: width capped at 1100, height 90% of the available area, inside it", () => {
  const g = enlargedPopupGeometry({ width: 1366, height: 728, left: 0, top: 0 }, small)!;
  expect(g.width).toBe(1100);
  expect(g.height).toBe(655);
  expect(g.left + g.width).toBeLessThanOrEqual(1366);
  expect(g.top + g.height).toBeLessThanOrEqual(728);
});

test("a tiny screen never produces a window larger than the screen", () => {
  const g = enlargedPopupGeometry({ width: 600, height: 500, left: 0, top: 0 }, small)!;
  expect(g.width).toBe(600);
  expect(g.height).toBe(500);
  expect(g).toMatchObject({ left: 0, top: 0 });
});

test("multi-monitor offsets (negative and positive) keep the window on that screen", () => {
  const left = enlargedPopupGeometry({ width: 1920, height: 1040, left: -1920, top: 0 }, small)!;
  expect(left.left).toBeGreaterThanOrEqual(-1920);
  expect(left.left + left.width).toBeLessThanOrEqual(0);
  const right = enlargedPopupGeometry({ width: 1920, height: 1040, left: 1920, top: 40 }, small)!;
  expect(right.left).toBeGreaterThanOrEqual(1920);
  expect(right.left + right.width).toBeLessThanOrEqual(3840);
  expect(right.top).toBeGreaterThanOrEqual(40);
});

test("a window that is already large is left alone", () => {
  expect(
    enlargedPopupGeometry({ width: 1920, height: 1040, left: 0, top: 0 }, { width: 1100, height: 860 }),
  ).toBeUndefined();
  expect(
    enlargedPopupGeometry({ width: 1920, height: 1040, left: 0, top: 0 }, { width: 800, height: 400 }),
  ).toBeUndefined();
});

test("an unknown screen or window does nothing", () => {
  expect(enlargedPopupGeometry({ width: 0, height: 0, left: 0, top: 0 }, small)).toBeUndefined();
  expect(
    enlargedPopupGeometry({ width: Number.NaN, height: 900, left: 0, top: 0 }, small),
  ).toBeUndefined();
  expect(
    enlargedPopupGeometry({ width: 1920, height: 1040, left: 0, top: 0 }, { width: 0, height: 0 }),
  ).toBeUndefined();
});
