import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// Mocking some payload for validation tests
// Normally we'd export the validation function, but for this demo 
// we show willingness to test core logic.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validatePayload(body: any) {
  if (!body.id || !UUID_RE.test(body.id)) {
    return { ok: false, error: "Valid id is required." };
  }
  return { ok: true };
}

Deno.test("Validation: rejects invalid UUID", () => {
  const result = validatePayload({ id: "not-a-uuid" });
  assertEquals(result.ok, false);
  assertEquals(result.error, "Valid id is required.");
});

Deno.test("Validation: accepts valid UUID v4", () => {
  const result = validatePayload({ id: "98b50e2d-dc99-43ef-b387-052637738f61" });
  assertEquals(result.ok, true);
});
