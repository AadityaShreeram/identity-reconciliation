function validateIdentifyInput(body) {
  const { email, phoneNumber } = body;

  if (!email && !phoneNumber) {
    return { valid: false, error: "Email or phoneNumber is required" };
  }

  if (email && typeof email !== "string") {
    return { valid: false, error: "Email must be a string" };
  }

  if (phoneNumber && typeof phoneNumber !== "string") {
    return { valid: false, error: "Phone number must be a string" };
  }

  return { valid: true };
}

module.exports = { validateIdentifyInput };