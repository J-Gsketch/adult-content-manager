import { describe, expect, it } from "vitest";
import { buildSyntheticUser, getDevAppId } from "./devAuthBypass";
import { ENV } from "./env";

describe("devAuthBypass", () => {
  it("buildSyntheticUser returns a valid user shape", () => {
    const u = buildSyntheticUser({ openId: "x", name: "y" });
    expect(u.openId).toBe("x");
    expect(u.name).toBe("y");
    expect(u.role).toBe("user");
  });

  it("getDevAppId falls back when appId missing", () => {
    const original = ENV.appId;
    (ENV as any).appId = "";
    expect(getDevAppId()).toBe("dev-app");
    (ENV as any).appId = original;
  });
});

