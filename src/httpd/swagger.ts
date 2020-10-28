export type ArgType = "string" | "integer" | "enum" | "boolean" | "array";

export interface SwaggerSchema {
  type?: ArgType;
  format?: "int64" | "int32" | "date-time";
  example?: any;
  description?: string;
  enum?: any[];
  default?: any;
  items?: SwaggerSchema;
  $ref?: string;
}

export interface SwaggerModal {
  type: "object";
  properties: {
    [key: string]: SwaggerSchema;
  };
  xml: {
    name: string;
  };
}

export interface SwaggerApi {
  tags: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  consumes?: Array<"application/json" | "application/xml">;
  produces?: Array<"application/json" | "application/xml">;
  parameters?: Array<{
    in?: "body" | "path" | "query";
    name: "body" | string;
    description?: string;
    required?: boolean;
    schema?: SwaggerSchema;
  }>;
  responses?: {
    [key: string]: {
      description?: string;
      schema?: SwaggerSchema;
    };
  };
}

export interface SwaggerDoc {
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
    [key: string]: SwaggerModal;
  };
  paths: {
    [key: string]: {
      [key: string]: SwaggerApi;
    };
  };
}
