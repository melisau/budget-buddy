// Sign-in, sign-up and marketing pages are designed for light colors only.
const lightOnly = /^\/(en\/?)?$|^\/(en\/)?(sign-in|sign-up|forgot-password|update-password|privacy|terms|account-deletion|auth|w)(\/|$)/;

export function isLightOnlyPath(pathname: string) {
  return lightOnly.test(pathname);
}
