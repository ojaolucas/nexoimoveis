const db = require('../config/database');

/**
 * Generates the next sequential code for a table entity.
 * @param {string} prefix e.g., 'PR' for Proprietarios
 * @param {string} tableName e.g., 'proprietarios'
 * @param {string} columnName e.g., 'codigo'
 * @returns {Promise<string>} e.g., 'PR0001'
 */
async function generateNextCode(prefix, tableName, columnName) {
  try {
    // Queries the database to extract numbers from the code column
    const query = `
      SELECT MAX(CAST(SUBSTRING(${columnName} FROM '\\d+') AS INTEGER)) AS max_val
      FROM ${tableName}
      WHERE ${columnName} LIKE $1
    `;
    const result = await db.query(query, [`${prefix}%`]);
    const maxVal = result.rows[0]?.max_val || 0;
    const nextVal = maxVal + 1;
    
    // Pad next value to 4 digits (e.g. PR0001)
    const padded = String(nextVal).padStart(4, '0');
    return `${prefix}${padded}`;
  } catch (error) {
    console.error(`Error generating code for ${tableName}:`, error);
    // Fallback to timestamp to avoid blocking
    return `${prefix}${Date.now()}`;
  }
}

module.exports = {
  generateNextCode,
};
