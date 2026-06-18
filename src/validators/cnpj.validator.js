/**
 * Validates a CNPJ string.
 * @param {string} cnpj 
 * @returns {boolean}
 */
function validateCNPJ(cnpj) {
  if (!cnpj) return false;

  // Remove formatting characters (non-digits)
  const cleanCnpj = cnpj.replace(/\D/g, '');

  // Must have exactly 14 digits
  if (cleanCnpj.length !== 14) return false;

  // Cannot have all identical digits
  if (/^(\d)\1{13}$/.test(cleanCnpj)) return false;

  // Validate first verifier digit
  let size = cleanCnpj.length - 2;
  let numbers = cleanCnpj.substring(0, size);
  const digits = cleanCnpj.substring(size);
  let sum = 0;
  let pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0), 10)) return false;

  // Validate second verifier digit
  size = size + 1;
  numbers = cleanCnpj.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1), 10)) return false;

  return true;
}

module.exports = validateCNPJ;
