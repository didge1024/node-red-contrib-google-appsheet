'use strict';

jest.mock('axios');

const axios = require('axios');
const { createClient } = require('../src/lib/appsheet-client');

const APP_ID = 'test-app-id';
const ACCESS_KEY = 'test-access-key';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAxiosError(status, headers = {}) {
  const err = new Error('Request failed');
  err.response = {
    status,
    headers,
    data: { error: 'some error' },
  };
  return err;
}

function makeNetworkError() {
  const err = new Error('Network Error');
  err.request = {};   // set but no .response
  return err;
}

// ---------------------------------------------------------------------------
// createClient
// ---------------------------------------------------------------------------
describe('createClient', () => {
  it('returns an object with a request() method', () => {
    const client = createClient(APP_ID, ACCESS_KEY);
    expect(typeof client.request).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// client.request()
// ---------------------------------------------------------------------------
describe('client.request()', () => {
  let client;

  beforeEach(() => {
    jest.resetAllMocks();
    client = createClient(APP_ID, ACCESS_KEY);
  });

  // -------------------------------------------------------------------------
  // 1. Sends POST to correct URL with correct headers and body
  // -------------------------------------------------------------------------
  it('sends POST to correct URL with correct headers and body', async () => {
    axios.post.mockResolvedValue({ data: [] });

    await client.request({
      tableName: 'Orders',
      action: 'Find',
      properties: { Locale: 'en-US' },
      rows: [{ OrderID: '1' }],
    });

    expect(axios.post).toHaveBeenCalledTimes(1);

    const [url, body, config] = axios.post.mock.calls[0];

    expect(url).toBe(
      `https://api.appsheet.com/api/v2/apps/${APP_ID}/tables/Orders/Action`
    );
    expect(body).toEqual({
      Action: 'Find',
      Properties: { Locale: 'en-US' },
      Rows: [{ OrderID: '1' }],
    });
    expect(config.headers).toEqual({
      ApplicationAccessKey: ACCESS_KEY,
      'Content-Type': 'application/json',
    });
  });

  // -------------------------------------------------------------------------
  // 2. Returns response.data on success
  // -------------------------------------------------------------------------
  it('returns response.data on success', async () => {
    const responseData = [{ OrderID: '1', Amount: '100' }];
    axios.post.mockResolvedValue({ data: responseData });

    const result = await client.request({
      tableName: 'Orders',
      action: 'Find',
    });

    expect(result).toBe(responseData);
  });

  // -------------------------------------------------------------------------
  // 3. Defaults properties and rows to {} and []
  // -------------------------------------------------------------------------
  it('defaults properties to {} and rows to [] when not provided', async () => {
    axios.post.mockResolvedValue({ data: [] });

    await client.request({ tableName: 'Orders', action: 'Find' });

    const [, body] = axios.post.mock.calls[0];
    expect(body.Properties).toEqual({});
    expect(body.Rows).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // 4. Maps 401 to auth error
  // -------------------------------------------------------------------------
  it('throws structured auth error on 401', async () => {
    axios.post.mockRejectedValue(makeAxiosError(401));

    await expect(
      client.request({ tableName: 'Orders', action: 'Find' })
    ).rejects.toMatchObject({
      message: 'Invalid Application Access Key',
      status: 401,
    });
  });

  // -------------------------------------------------------------------------
  // 5. Maps 404 to not found error
  // -------------------------------------------------------------------------
  it('throws structured not-found error on 404', async () => {
    axios.post.mockRejectedValue(makeAxiosError(404));

    await expect(
      client.request({ tableName: 'Orders', action: 'Find' })
    ).rejects.toMatchObject({
      message: 'App or table not found',
      status: 404,
    });
  });

  // -------------------------------------------------------------------------
  // 6. Maps 429 to rate limit error with retryAfter
  // -------------------------------------------------------------------------
  it('throws structured rate-limit error on 429 with retryAfter', async () => {
    axios.post.mockRejectedValue(
      makeAxiosError(429, { 'retry-after': '30' })
    );

    await expect(
      client.request({ tableName: 'Orders', action: 'Find' })
    ).rejects.toMatchObject({
      message: 'Rate limit exceeded',
      status: 429,
      retryAfter: '30',
    });
  });

  // -------------------------------------------------------------------------
  // 7. Maps network error (err.request exists, no err.response)
  // -------------------------------------------------------------------------
  it('throws structured network error when no response is received', async () => {
    axios.post.mockRejectedValue(makeNetworkError());

    await expect(
      client.request({ tableName: 'Orders', action: 'Find' })
    ).rejects.toMatchObject({
      message: 'Cannot reach AppSheet API',
    });
  });
});
