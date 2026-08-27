import { describe, expect, it } from "vitest";

import { googleProvider } from "./auth.js";

describe("googleProvider", () => {
  it("accepts only the web client when no app client is configured", () => {
    expect(
      googleProvider({ clientId: "web-client", clientSecret: "secret", iosClientId: undefined }),
    ).toEqual({ clientId: "web-client", clientSecret: "secret" });
  });

  it("also accepts an id token minted for the iOS client", () => {
    const { clientId } = googleProvider({
      clientId: "web-client",
      clientSecret: "secret",
      iosClientId: "ios-client",
    });

    expect(clientId).toEqual(["web-client", "ios-client"]);
  });

  it("leaves the browser flow on the web client, which Better Auth takes first", () => {
    // Order is the contract, not a detail: everything the redirect flow needs —
    // the authorization URL and the code exchange, both of which use the client
    // secret — reads entry zero. Putting the app first would send the console
    // to Google as a client that has no secret.
    const { clientId } = googleProvider({
      clientId: "web-client",
      clientSecret: "secret",
      iosClientId: "ios-client",
    });

    expect(Array.isArray(clientId) ? clientId[0] : clientId).toBe("web-client");
  });
});
