function typeMatches(type, value) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  return typeof value === type;
}

export function validateSchema(schema, value, path = "$") {
  const errors = [];
  if (schema.oneOf) {
    const matches = schema.oneOf.filter(candidate => validateSchema(candidate, value, path).length === 0);
    if (matches.length !== 1) errors.push(`${path}: expected exactly one schema match`);
    return errors;
  }
  if (Object.hasOwn(schema, "const") && value !== schema.const) errors.push(`${path}: const mismatch`);
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: enum mismatch`);
  const types = schema.type ? (Array.isArray(schema.type) ? schema.type : [schema.type]) : [];
  if (types.length && !types.some(type => typeMatches(type, value))) {
    errors.push(`${path}: type mismatch`);
    return errors;
  }
  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path}: below minLength`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(`${path}: above maxLength`);
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) errors.push(`${path}: pattern mismatch`);
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path}: below minimum`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path}: above maximum`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path}: below minItems`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${path}: above maxItems`);
    if (schema.items) value.forEach((item, index) => errors.push(...validateSchema(schema.items, item, `${path}[${index}]`)));
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const key of schema.required || []) if (!Object.hasOwn(value, key)) errors.push(`${path}.${key}: required`);
    for (const [key, item] of Object.entries(value)) {
      if (schema.properties?.[key]) errors.push(...validateSchema(schema.properties[key], item, `${path}.${key}`));
      else if (schema.additionalProperties === false) errors.push(`${path}.${key}: additional property`);
      else if (schema.additionalProperties && typeof schema.additionalProperties === "object") errors.push(...validateSchema(schema.additionalProperties, item, `${path}.${key}`));
    }
  }
  return errors;
}
