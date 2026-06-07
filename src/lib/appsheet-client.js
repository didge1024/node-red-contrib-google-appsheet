'use strict';

const axios = require('axios');

const BASE_URL = 'https://api.appsheet.com/api/v2/apps';

/**
 * Creates a thin axios-based AppSheet API client.
 *
 * @param {string} appId      - AppSheet application ID.
 * @param {string} accessKey  - Application Access Key for authentication.
 * @returns {{ request: Function }}
 */
function createClient(appId, accessKey) {
  /**
   * Sends an action request to the AppSheet REST API.
   *
   * @param {Object} options
   * @param {string} options.tableName   - Target table name.
   * @param {string} options.action      - AppSheet action (e.g. 'Find', 'Add', 'Edit', 'Delete').
   * @param {Object} [options.properties={}] - AppSheet Properties block.
   * @param {Array}  [options.rows=[]]       - Rows payload.
   * @returns {Promise<*>} Resolves with response.data on success.
   */
  async function request({ tableName, action, properties, rows }) {
    const url = `${BASE_URL}/${appId}/tables/${tableName}/Action`;

    const body = {
      Action: action,
      Properties: properties || {},
      Rows: rows || [],
    };

    const config = {
      headers: {
        ApplicationAccessKey: accessKey,
        'Content-Type': 'application/json',
      },
    };

    try {
      const response = await axios.post(url, body, config);
      return response.data;
    } catch (err) {
      throw mapError(err);
    }
  }

  return { request };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Maps an axios error to a structured domain error object.
 *
 * @param {Error} err - The original axios error.
 * @returns {Object} Structured error with at minimum a `message` property.
 */
function mapError(err) {
  if (err.response) {
    const { status, headers } = err.response;

    switch (status) {
      case 401:
        return { message: 'Invalid Application Access Key', status: 401 };
      case 404:
        return { message: 'App or table not found', status: 404 };
      case 429:
        return {
          message: 'Rate limit exceeded',
          status: 429,
          retryAfter: headers['retry-after'],
        };
      default:
        return { message: `AppSheet API error (HTTP ${status})`, status };
    }
  }

  if (err.request) {
    return { message: 'Cannot reach AppSheet API' };
  }

  // Unexpected error (programming error, JSON parse failure, etc.)
  return { message: err.message || 'Unknown error' };
}

module.exports = { createClient };
