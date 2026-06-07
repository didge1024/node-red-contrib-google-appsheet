'use strict';

const coercion = require('./type-coercion');

/**
 * Factory that creates a schema object for a given AppSheet table.
 *
 * @param {string} tableName  - Name of the AppSheet table.
 * @param {Object} columns    - Map of column name → { type, key }.
 * @returns {Object} Schema object with validate(), formatForApi(), parseResponse().
 */
function createSchema(tableName, columns) {
  // Determine the key field (first column where key === true).
  const keyField = Object.keys(columns).find((col) => columns[col].key === true);

  // ---------------------------------------------------------------------------
  // validate(rows, action)
  // ---------------------------------------------------------------------------
  function validate(rows, action) {
    if (!Array.isArray(rows)) {
      rows = [rows];
    }

    const errors = [];
    const requireKey = action === 'Edit' || action === 'Delete';

    rows.forEach((row, rowIndex) => {
      // Check for unknown column names.
      Object.keys(row).forEach((field) => {
        if (!(field in columns)) {
          errors.push({
            row: rowIndex,
            field,
            message: `Unknown column "${field}" is not in the schema`,
          });
        }
      });

      // Check key field presence for Edit / Delete.
      if (requireKey && keyField !== undefined) {
        const keyValue = row[keyField];
        if (keyValue === undefined || keyValue === null || keyValue === '') {
          errors.push({
            row: rowIndex,
            field: keyField,
            message: `Key field "${keyField}" is required for ${action} but is missing or empty`,
          });
        }
      }
    });

    return errors.length === 0
      ? { valid: true, errors: [] }
      : { valid: false, errors };
  }

  // ---------------------------------------------------------------------------
  // formatForApi(rows)
  // ---------------------------------------------------------------------------
  function formatForApi(rows) {
    if (!Array.isArray(rows)) {
      rows = [rows];
    }

    const coercedRows = [];
    const errors = [];

    rows.forEach((row, rowIndex) => {
      const coercedRow = {};

      Object.keys(row).forEach((field) => {
        const val = row[field];

        // Null/undefined pass through as-is.
        if (val === null || val === undefined) {
          coercedRow[field] = val;
          return;
        }

        // Column not in schema: pass through.
        if (!(field in columns)) {
          coercedRow[field] = val;
          return;
        }

        const typeName = columns[field].type;
        const typeHandler = coercion[typeName];

        // Unknown type handler: pass through.
        if (!typeHandler || typeof typeHandler.toApi !== 'function') {
          coercedRow[field] = val;
          return;
        }

        const result = typeHandler.toApi(val);
        if (result.error) {
          errors.push({
            row: rowIndex,
            field,
            message: result.error,
          });
          // Leave the field absent from coercedRow (or keep original).
          // Keep original so the row object is still present.
          coercedRow[field] = val;
        } else {
          coercedRow[field] = result.value;
        }
      });

      coercedRows.push(coercedRow);
    });

    return { rows: coercedRows, errors };
  }

  // ---------------------------------------------------------------------------
  // parseResponse(rows)
  // ---------------------------------------------------------------------------
  function parseResponse(rows) {
    if (rows === null || rows === undefined) {
      return [];
    }

    return rows.map((row) => {
      const parsed = {};

      Object.keys(row).forEach((field) => {
        // Strip _RowNumber.
        if (field === '_RowNumber') return;

        const val = row[field];

        // Column not in schema: pass through.
        if (!(field in columns)) {
          parsed[field] = val;
          return;
        }

        const typeName = columns[field].type;
        const typeHandler = coercion[typeName];

        // Unknown type handler: pass through.
        if (!typeHandler || typeof typeHandler.fromApi !== 'function') {
          parsed[field] = val;
          return;
        }

        parsed[field] = typeHandler.fromApi(val);
      });

      return parsed;
    });
  }

  return {
    tableName,
    keyField,
    columns,
    validate,
    formatForApi,
    parseResponse,
  };
}

module.exports = { createSchema };
