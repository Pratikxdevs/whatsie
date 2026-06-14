/**
 * clerk-bridge.ts — M-004
 *
 * Module-level singleton that holds Clerk token/logout references.
 * Replaces the fragile window.__clerkGetToken / window.__clerkLogout
 * monkey-patch. Import this module anywhere you need auth functions —
 * no global object access required.
 */

type GetTokenFn = () => Promise<string | null>;
type SignOutFn = () => void | Promise<void>;

let _getToken: GetTokenFn | null = null;
let _signOut: SignOutFn | null = null;

export const clerkBridge = {
  /** Called once by AuthProvider once Clerk hooks are available. */
  init(getToken: GetTokenFn, signOut: SignOutFn) {
    _getToken = getToken;
    _signOut = signOut;
  },

  async getToken(): Promise<string | null> {
    if (!_getToken) return null;
    try {
      return await _getToken();
    } catch {
      return null;
    }
  },

  async signOut(): Promise<void> {
    if (!_signOut) return;
    try {
      await _signOut();
    } catch {
      // ignore
    }
  },
};
