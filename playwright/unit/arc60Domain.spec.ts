// Node-only unit tests for the ARC-60 domain <-> session origin binding.
import { test, expect } from "@playwright/test";
import { domainMatchesSessionOrigin } from "../../src/scripts/encoding/arc60Domain";

test("accepts the hostname of the origin", () => {
  expect(domainMatchesSessionOrigin("dapp.example.com", "https://dapp.example.com")).toBe(true);
  expect(domainMatchesSessionOrigin("DApp.Example.com", "https://dapp.example.com")).toBe(true);
  expect(domainMatchesSessionOrigin(" dapp.example.com ", "https://dapp.example.com")).toBe(true);
});

test("accepts location.host (hostname:port) of an origin with a non-default port", () => {
  expect(domainMatchesSessionOrigin("localhost:5173", "http://localhost:5173")).toBe(true);
  expect(domainMatchesSessionOrigin("localhost", "http://localhost:5173")).toBe(true);
  expect(domainMatchesSessionOrigin("dapp.example.com:8443", "https://dapp.example.com:8443")).toBe(true);
});

test("a default port never appears in host, so the bare hostname is the only form", () => {
  expect(domainMatchesSessionOrigin("dapp.example.com:443", "https://dapp.example.com")).toBe(false);
});

test("rejects another host, another port and substring tricks", () => {
  expect(domainMatchesSessionOrigin("localhost:3000", "http://localhost:5173")).toBe(false);
  expect(domainMatchesSessionOrigin("evil.example.com", "https://dapp.example.com")).toBe(false);
  expect(domainMatchesSessionOrigin("dapp.example.com.evil.com", "https://dapp.example.com")).toBe(false);
  expect(domainMatchesSessionOrigin("example.com", "https://dapp.example.com")).toBe(false);
  expect(domainMatchesSessionOrigin("localhost:5173@evil.com", "http://localhost:5173")).toBe(false);
});

test("rejects empty or unparsable inputs", () => {
  expect(domainMatchesSessionOrigin("", "https://dapp.example.com")).toBe(false);
  expect(domainMatchesSessionOrigin("dapp.example.com", "")).toBe(false);
  expect(domainMatchesSessionOrigin("dapp.example.com", undefined)).toBe(false);
  expect(domainMatchesSessionOrigin("dapp.example.com", "not a url")).toBe(false);
});
