// Small shared helper for the common `catch (err) { const msg = err.message
// ?? err; ... }` pattern repeated across NewAccount/* pages. Catch clauses
// are typed `unknown` by TS (not `any`), so callers need a safe way to pull a
// displayable message out of whatever was thrown.
export const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === "string") {
    return err;
  }
  return String(err);
};
