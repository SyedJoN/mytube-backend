export function getCookieOptions(httpOnly, expiry, useMaxAge = true) {
  const options = {
    httpOnly,
    secure: true,
    sameSite: "none",
  };
  if (useMaxAge) {
    options.maxAge = expiry;
  } else {
    options.expires = expiry;
  }
  return options;
}
