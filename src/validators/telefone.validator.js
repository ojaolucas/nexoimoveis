/**
 * Validates a Brazilian telephone string (DDD + 8 or 9 digits).
 * @param {string} phone 
 * @returns {boolean}
 */
function validateTelefone(phone) {
  if (!phone) return false;
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  // DDD + number (10 or 11 digits)
  return cleaned.length === 10 || cleaned.length === 11;
}

module.exports = validateTelefone;
