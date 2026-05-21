/**
 * Script Snippets Library - Reusable code snippets for pre-request and test scripts
 */

export interface Snippet {
  id: string;
  name: string;
  category: "test" | "pre-request" | "utility";
  description: string;
  code: string;
}

export const BUILT_IN_SNIPPETS: Snippet[] = [
  // Test Snippets
  {
    id: "test-status-200",
    name: "Status code is 200",
    category: "test",
    description: "Check if response status is 200 OK",
    code: `pm.test('Status code is 200', () => {
  pm.expect(pm.response.status).to.equal(200);
});`,
  },
  {
    id: "test-status-2xx",
    name: "Status code is 2xx",
    category: "test",
    description: "Check if response status is in 200 range",
    code: `pm.test('Status code is 2xx', () => {
  pm.expect(pm.response.status).to.be.above(199);
  pm.expect(pm.response.status).to.be.below(300);
});`,
  },
  {
    id: "test-response-time",
    name: "Response time is acceptable",
    category: "test",
    description: "Check if response time is under 500ms",
    code: `pm.test('Response time is less than 500ms', () => {
  pm.expect(pm.response.time).to.be.below(500);
});`,
  },
  {
    id: "test-json-body",
    name: "Response body is JSON",
    category: "test",
    description: "Verify response body can be parsed as JSON",
    code: `pm.test('Response body is valid JSON', () => {
  const json = pm.response.json();
  pm.expect(json).to.exist;
});`,
  },
  {
    id: "test-has-property",
    name: "Response has property",
    category: "test",
    description: "Check if JSON response has a specific property",
    code: `pm.test('Response has expected property', () => {
  const json = pm.response.json();
  pm.expect(json).to.have.property('data');
});`,
  },
  {
    id: "test-array-not-empty",
    name: "Response array is not empty",
    category: "test",
    description: "Check if response array has items",
    code: `pm.test('Response array is not empty', () => {
  const json = pm.response.json();
  pm.expect(json.length).to.be.above(0);
});`,
  },
  {
    id: "test-content-type",
    name: "Content-Type is JSON",
    category: "test",
    description: "Verify Content-Type header is application/json",
    code: `pm.test('Content-Type is application/json', () => {
  const contentType = pm.response.headers['content-type'] || '';
  pm.expect(contentType).to.include('application/json');
});`,
  },
  {
    id: "test-set-variable",
    name: "Set variable from response",
    category: "test",
    description: "Extract value from response and save as variable",
    code: `pm.test('Extract and save token', () => {
  const json = pm.response.json();
  pm.variables.set('token', json.access_token);
  console.log('Token saved:', json.access_token);
});`,
  },

  // Pre-request Snippets
  {
    id: "pre-timestamp",
    name: "Set timestamp variable",
    category: "pre-request",
    description: "Set current timestamp as a variable",
    code: `pm.variables.set('timestamp', Date.now().toString());
console.log('Timestamp set:', Date.now());`,
  },
  {
    id: "pre-random-id",
    name: "Generate random ID",
    category: "pre-request",
    description: "Generate a random UUID-like string",
    code: `const randomId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
pm.variables.set('randomId', randomId);
console.log('Random ID:', randomId);`,
  },
  {
    id: "pre-add-header",
    name: "Add custom header",
    category: "pre-request",
    description: "Add a dynamic header to the request",
    code: `pm.request.addHeader('X-Request-ID', Math.random().toString(36).slice(2));
pm.request.addHeader('X-Timestamp', Date.now().toString());`,
  },
  {
    id: "pre-basic-auth",
    name: "Generate Basic Auth header",
    category: "pre-request",
    description: "Create Base64 encoded Basic Auth header",
    code: `const username = pm.variables.get('username') || 'user';
const password = pm.variables.get('password') || 'pass';
const encoded = btoa(username + ':' + password);
pm.request.addHeader('Authorization', 'Basic ' + encoded);`,
  },

  // Utility Snippets
  {
    id: "util-log-request",
    name: "Log request details",
    category: "utility",
    description: "Log the full request details to console",
    code: `console.log('Method:', pm.request.method);
console.log('URL:', pm.request.url);
console.log('Headers:', JSON.stringify(pm.request.headers, null, 2));`,
  },
  {
    id: "util-log-response",
    name: "Log response details",
    category: "utility",
    description: "Log the full response details to console",
    code: `console.log('Status:', pm.response.status);
console.log('Time:', pm.response.time + 'ms');
console.log('Body:', pm.response.text().substring(0, 200));`,
  },
  {
    id: "util-json-schema",
    name: "Validate JSON Schema",
    category: "utility",
    description: "Basic JSON schema validation",
    code: `pm.test('Response matches schema', () => {
  const json = pm.response.json();
  
  // Define expected fields
  const requiredFields = ['id', 'name', 'email'];
  
  for (const field of requiredFields) {
    pm.expect(json).to.have.property(field);
  }
});`,
  },
];
