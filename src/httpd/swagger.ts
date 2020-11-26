/**
 * 基础数据结构定义
 */
export interface BaseSchema<T = any> {
  type?: "string" | "integer" | "enum" | "boolean" | "array" | "object";
  example?: T;
  description?: string;
  default?: T;
  required?: boolean;
  [key: string]: any;
}

/**
 * 数值类型结构
 */
export interface StringSchema extends BaseSchema<string> {
  type?: "string";
}

/**
 * 数值类型结构
 */
export interface NumberSchema extends BaseSchema<number> {
  type?: "integer";
  format?: "int64" | "int32" | "date-time";
}

/**
 * 数值类型结构
 */
export interface BooleanSchema extends BaseSchema<boolean> {
  type?: "boolean";
}

/**
 * 数值类型结构
 */
export interface EnumSchema<T = any> extends BaseSchema<T> {
  type?: "enum";
  enum?: T[];
}

/**
 * 数组类型结构
 */
export interface ArraySchema<T = any> extends BaseSchema<T> {
  type?: "array";
  items?: BaseSchema<T>;
}

/**
 * 对象类型结构
 */
export interface ObjectSchema<T = any> extends BaseSchema<T> {
  type?: "object";
  $ref?: string;
  properties?: { [key: string]: BaseSchema };
}

/**
 * 请求参数
 */
export interface Parameter<T = any> extends BaseSchema {
  in: "body" | "path" | "header" | "query";
  name: "body" | string;
  description?: string;
  required?: boolean;
  default?: T;
  schema?: BaseSchema;
}

/**
 * 接口申明
 */
export interface Api {
  tags: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  consumes: string[];
  produces: string[];
  parameters: Parameter[];
  responses: {
    [key: string]: {
      description?: string;
      schema?: BaseSchema;
    };
  };
}

export interface Doc {
  swagger: string;
  schemes: Array<"https" | "http">;
  host: string;
  info: {
    description: string;
    version: string;
    title: string;
  };
  tags: Array<{
    name?: string;
    description?: string;
    externalDocs?: {
      description?: string;
      url?: string;
    };
  }>;
  definitions: {
    [name: string]: BaseSchema;
  };
  paths: {
    [uri: string]: {
      [method: string]: Api;
    };
  };
}
