/**
 * Simple JSON Schema Validator
 * Validates response body against a JSON Schema (subset of JSON Schema Draft 7)
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateJsonSchema(data: any, schema: any): ValidationResult {
  const errors: string[] = [];
  validate(data, schema, "", errors);
  return { valid: errors.length === 0, errors };
}

function validate(data: any, schema: any, path: string, errors: string[]) {
  if (!schema || typeof schema !== "object") return;

  // Type check
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actualType = getType(data);
    if (!types.includes(actualType) && !(actualType === "integer" && types.includes("number"))) {
      errors.push(`${path || "root"}: expected type "${schema.type}" but got "${actualType}"`);
      return;
    }
  }

  // Enum
  if (schema.enum && !schema.enum.includes(data)) {
    errors.push(`${path || "root"}: value must be one of [${schema.enum.join(", ")}]`);
  }

  // String validations
  if (typeof data === "string") {
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      errors.push(`${path || "root"}: string length must be >= ${schema.minLength}`);
    }
    if (schema.maxLength !== undefined && data.length > schema.maxLength) {
      errors.push(`${path || "root"}: string length must be <= ${schema.maxLength}`);
    }
    if (schema.pattern) {
      try {
        if (!new RegExp(schema.pattern).test(data)) {
          errors.push(`${path || "root"}: string must match pattern "${schema.pattern}"`);
        }
      } catch {
        // Invalid regex, skip
      }
    }
  }

  // Number validations
  if (typeof data === "number") {
    if (schema.minimum !== undefined && data < schema.minimum) {
      errors.push(`${path || "root"}: must be >= ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && data > schema.maximum) {
      errors.push(`${path || "root"}: must be <= ${schema.maximum}`);
    }
  }

  // Array validations
  if (Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      errors.push(`${path || "root"}: array must have >= ${schema.minItems} items`);
    }
    if (schema.maxItems !== undefined && data.length > schema.maxItems) {
      errors.push(`${path || "root"}: array must have <= ${schema.maxItems} items`);
    }
    if (schema.items) {
      data.forEach((item, i) => {
        validate(item, schema.items, `${path}[${i}]`, errors);
      });
    }
  }

  // Object validations
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    // Required fields
    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (!(field in data)) {
          errors.push(`${path || "root"}: missing required field "${field}"`);
        }
      }
    }

    // Properties
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in data) {
          validate(data[key], propSchema, `${path}.${key}`, errors);
        }
      }
    }

    // Additional properties
    if (schema.additionalProperties === false && schema.properties) {
      const allowed = new Set(Object.keys(schema.properties));
      for (const key of Object.keys(data)) {
        if (!allowed.has(key)) {
          errors.push(`${path || "root"}: unexpected property "${key}"`);
        }
      }
    }
  }
}

function getType(value: any): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number" && Number.isInteger(value)) return "integer";
  return typeof value;
}

/**
 * Generate a JSON Schema from a sample JSON object
 */
export function generateSchemaFromSample(data: any): any {
  if (data === null) return { type: "null" };
  if (Array.isArray(data)) {
    return {
      type: "array",
      items: data.length > 0 ? generateSchemaFromSample(data[0]) : {},
    };
  }
  if (typeof data === "object") {
    const properties: Record<string, any> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(data)) {
      properties[key] = generateSchemaFromSample(value);
      required.push(key);
    }
    return { type: "object", properties, required };
  }
  if (typeof data === "number") {
    return { type: Number.isInteger(data) ? "integer" : "number" };
  }
  return { type: typeof data };
}
