import { afterEach, describe, expect, it } from "vitest";
import { rateLimit, resetRateLimits } from "../rate-limit";

afterEach(() => {
  resetRateLimits();
});

describe("rateLimit", () => {
  it("permite hasta max peticiones en la ventana", async () => {
    for (let i = 0; i < 5; i++) {
      await expect(
        rateLimit("test:key", { max: 5, windowSec: 60 }),
      ).resolves.toBe(true);
    }
    await expect(
      rateLimit("test:key", { max: 5, windowSec: 60 }),
    ).resolves.toBe(false);
  });

  it("clave distinta tiene su propio cubo", async () => {
    await expect(rateLimit("a:key", { max: 1, windowSec: 60 })).resolves.toBe(
      true,
    );
    await expect(rateLimit("a:key", { max: 1, windowSec: 60 })).resolves.toBe(
      false,
    );
    await expect(rateLimit("b:key", { max: 1, windowSec: 60 })).resolves.toBe(
      true,
    );
  });

  it("reinicia la ventana al expirar", async () => {
    await expect(rateLimit("exp:key", { max: 1, windowSec: -1 })).resolves.toBe(
      true,
    );
    // resetAt ya expiró (ventana negativa) → nuevo cubo
    await expect(rateLimit("exp:key", { max: 1, windowSec: 60 })).resolves.toBe(
      true,
    );
  });
});
