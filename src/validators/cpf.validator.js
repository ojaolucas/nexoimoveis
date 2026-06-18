/**
 * Validates a CPF string.
 * @param {string} cpf 
 * @returns {boolean}
 */
function validateCPF(cpf) {
  if (!cpf) return false;
  
  // Remove formatting characters (non-digits)
  const cleanCpf = cpf.replace(/\D/g, '');

  // Must have exactly 11 digits
  if (cleanCpf.length !== 11) return false;

  // Cannot have all identical digits (e.g. 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cleanCpf)) return false;

  // Validate first verifier digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCpf.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCpf.charAt(9), 10)) return false;

  // Validate second verifier digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCpf.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCpf.charAt(10), 10)) return false;

  return true;
}

module.exports = validateCPF;
