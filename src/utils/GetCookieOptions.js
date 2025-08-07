export function getCookieOptions(httpOnly, expiry, useMaxAge = true) {
  const isProduction = process.env.NODE_ENV === 'production';
  const options = {
    httpOnly,
    secure: process.env.NODE_ENV === 'production',
    sameSite: isProduction ? "none" : "lax",
    path: "/"
  };
  if (useMaxAge) {
    options.maxAge = expiry;
  } else {
    options.expires = expiry;
  }
  return options;
}
