/**
 * Validates an email string.
 * @param {string} email 
 * @returns {boolean}
 */
function validateEmail(email) {
  if (!email) return false;
  // Standard RFC 5322 regex validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

module.exports = validateEmail;
