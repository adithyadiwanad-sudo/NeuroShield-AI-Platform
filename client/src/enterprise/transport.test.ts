import test from "node:test";
import assert from "node:assert/strict";
import { resolveEndpoints } from "./apiConfig.ts";
test("Vite and NEXT_PUBLIC endpoints support decoupled secure hosting", () => {
  assert.deepEqual(resolveEndpoints({}, true), {
    apiUrl: "http://localhost:8000",
    wsUrl: "ws://localhost:8000/ws/live-feed",
    error: "",
  });
  assert.equal(
    resolveEndpoints(
      { NEXT_PUBLIC_API_URL: "https://neuroshield.onrender.com/api/" },
      false,
    ).wsUrl,
    "wss://neuroshield.onrender.com/ws/live-feed",
  );
  assert.equal(
    resolveEndpoints(
      {
        VITE_API_URL: "https://first.example",
        NEXT_PUBLIC_API_URL: "https://second.example",
        NEXT_PUBLIC_WS_URL: "wss://stream.example/ws/live-feed",
      },
      false,
    ).apiUrl,
    "https://first.example",
  );
  assert.ok(resolveEndpoints({}, false).error);
  assert.ok(
    resolveEndpoints({ NEXT_PUBLIC_API_URL: "http://localhost:8000" }, false)
      .error,
  );
  assert.ok(
    resolveEndpoints({ NEXT_PUBLIC_API_URL: "javascript:alert(1)" }, true)
      .error,
  );
  assert.ok(
    resolveEndpoints(
      { NEXT_PUBLIC_API_URL: "https://user:secret@example.com" },
      false,
    ).error,
  );
});
