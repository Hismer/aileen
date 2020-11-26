import { Component } from "../container";
import { HTTPMethod } from "trouter";
import { Context } from "./route";
import {
  Api,
  BaseSchema,
  Parameter,
  StringSchema,
  NumberSchema,
  BooleanSchema,
  EnumSchema,
  ArraySchema,
  ObjectSchema,
} from "./swagger";
import { Annotation } from "../core/annotation";
import { BadRequestError } from "./error";
import bodyParse from "co-body";
import { boolean as toBoolean } from "boolean";

/**
 * 控制器配置
 */
export class ControllerConfig {
  /**
   * 基础路径
   */
  public basePath: string = "/";

  /**
   * 标签启动
   */
  public tags: string[] = [];

  /**
   * 接口映射
   */
  public mappers: {
    [key: string]: Array<{
      method: HTTPMethod;
      path: string;
    }>;
  } = {};

  /**
   * 获取映射
   * @param key
   * @param autoCreate
   */
  public getMapper(key: string | symbol, autoCreate: boolean = true) {
    const id = key.toString();
    if (this.mappers[id]) return this.mappers[id];
    if (!autoCreate) return;
    return (this.mappers[id] = []);
  }

  /**
   * 接口API文档
   */
  public documents: {
    [key: string]: Api;
  } = {};

  /**
   * 获取API文档
   * @param key
   * @param autoCreate
   */
  public getDocument(key: string | symbol, autoCreate: boolean = true) {
    const id = key.toString();
    if (this.documents[id]) return this.documents[id];
    if (!autoCreate) return;
    return (this.documents[id] = {
      tags: [],
      consumes: ["application/json"],
      produces: ["application/json"],
      parameters: [],
      responses: {},
    });
  }

  /**
   * 接口设置项目
   */
  public apiOptions: {
    [key: string]: {
      responseStatus: number;
      cachedTimeout: number;
      cachedKey?: (ctx: Context) => string;
    };
  } = {};

  /**
   * 获取API选项
   * @param key
   * @param autoCreate
   */
  public getApiOption(key: string | symbol, autoCreate: boolean = true) {
    const id = key.toString();
    if (this.apiOptions[id]) return this.apiOptions[id];
    if (!autoCreate) return;
    return (this.apiOptions[id] = {
      responseStatus: 200,
      cachedTimeout: 0,
    });
  }

  /**
   * API方法参数
   */
  public apiArguments: {
    [key: string]: Array<{
      resolve: (ctx: Context) => any;
    }>;
  } = {};

  /**
   * 获取API参数
   * @param key
   * @param index
   * @param autoCreate
   */
  public getApiArgument(
    key: string | symbol,
    index: number,
    autoCreate: boolean = true
  ) {
    const id = key.toString();
    if (!this.apiArguments[id] && autoCreate) {
      this.apiArguments[id] = [];
    }
    const args = this.apiArguments[id];
    if (!args) return;

    if (args[index]) return args[index];
    return (args[index] = {
      resolve: () => undefined,
    });
  }
}

// 创建注解
const builder = () => new ControllerConfig();
export const annotation = new Annotation(builder);

/**
 * 数据类型
 */
export interface DataSchema {
  String: StringSchema;
  Number: NumberSchema;
  Boolean: BooleanSchema;
  Enum: (...values: any[]) => EnumSchema;
  Array: (item: BaseSchema) => ArraySchema;
  Object: (option: string | { [key: string]: BaseSchema }) => ObjectSchema;
}

/**
 * 类型生成器
 */
export const DataType = {
  String: (option: string | StringSchema): StringSchema => {
    const res: StringSchema = { type: "string" };
    if (!option) return res;
    if (typeof option === "string") {
      res.description = option;
      return res;
    }
    return {
      ...res,
      ...option,
    };
  },
  Number: (option?: string | NumberSchema): NumberSchema => {
    const res: NumberSchema = {
      type: "integer",
      format: "int32",
    };
    if (!option) return res;
    if (typeof option === "string") {
      res.description = option;
      return res;
    }
    return {
      ...res,
      ...option,
    };
  },
  Boolean: (option: string | BooleanSchema): BooleanSchema => {
    const res: BooleanSchema = { type: "boolean" };
    if (!option) return res;
    if (typeof option === "string") {
      res.description = option;
      return res;
    }
    return {
      ...res,
      ...option,
    };
  },
  Enum: <T>(
    option: string | EnumSchema<T>,
    values: T[] = []
  ): EnumSchema<T> => {
    const res: EnumSchema = {
      type: "enum",
      enum: [],
    };
    if (!option) return res;
    if (typeof option === "string") {
      res.description = option;
      res.enum = values;
      return res;
    }
    return {
      ...res,
      ...option,
    };
  },
  Array: (option: string | BaseSchema, items?: BaseSchema): ArraySchema => {
    if (typeof option === "string") {
      return {
        type: "array",
        description: option,
        items,
      };
    } else {
      return {
        type: "array",
        items: option,
      };
    }
  },
  Object: (
    option: string | { [key: string]: BaseSchema },
    schema?: { [key: string]: BaseSchema }
  ): ObjectSchema => {
    const res: ObjectSchema = { type: "object" };
    if (typeof option === "string") {
      res.description = option;
      res.properties = schema;
      return res;
    } else {
      res.properties = option;
      return res;
    }
  },
  ObjectRef: (option: string, ref?: string): ObjectSchema => {
    const res: ObjectSchema = { type: "object" };
    if (ref) {
      res.description = option;
      res.$ref = ref;
      return res;
    } else {
      res.$ref = option;
      return res;
    }
  },
};

/**
 * 组件注入注解申明
 */
export interface ControllerOption {
  path?: string;
  tag?: string | string[];
}

/**
 * 控制器解析注解
 * @param id
 */
export const Controller = (options: ControllerOption = {}): ClassDecorator =>
  annotation.exportDecorator((data) => {
    if (options.path) data.basePath = options.path;
    if (options.tag) {
      if (options.tag instanceof Array) data.tags.push(...options.tag);
      else data.tags.push(options.tag);
    }
  }, Component());

/**
 * HTTP请求方法注解
 * @param path
 */
export const HTTP = (method: HTTPMethod, path: string = ""): MethodDecorator =>
  annotation.exportDecorator((data, { propertyKey }) => {
    data.getMapper(propertyKey).push({ method, path });
  });

/**
 * HTTP包装方法注解
 * @param path
 */
export const GET = (path: string = ""): MethodDecorator => HTTP("GET", path);
export const POST = (path: string = ""): MethodDecorator => HTTP("POST", path);
export const PUT = (path: string = ""): MethodDecorator => HTTP("PUT", path);
export const PATCH = (path: string = ""): MethodDecorator =>
  HTTP("PATCH", path);
export const DELETE = (path: string = ""): MethodDecorator =>
  HTTP("DELETE", path);

/**
 * 接口标签注解
 * @param names
 */
export const Tags = (...names: string[]): ClassDecorator & MethodDecorator =>
  annotation.exportDecorator((data, { type, propertyKey }) => {
    if (type === "Method") data.getDocument(propertyKey).tags.push(...names);
    else if (type === "Class") data.tags.push(...names);
  });

/**
 * 接口缓存注解
 * @param timeout
 * @param key
 */
export const Cache = (
  timeout: number = 60,
  key?: (ctx: Context) => string
): MethodDecorator =>
  annotation.exportDecorator((data, { propertyKey }) => {
    const option = data.getApiOption(propertyKey);
    option.cachedTimeout = timeout;
    if (key) option.cachedKey = key;
  });

/**
 * 描述说明注解
 * @param description
 */
export const Description = (description: string): MethodDecorator =>
  annotation.exportDecorator((data, { propertyKey }) => {
    data.getDocument(propertyKey).description = description;
  });

/**
 * 描述说明注解
 * @param summary
 */
export const Summary = (summary: string): MethodDecorator =>
  annotation.exportDecorator((data, { propertyKey }) => {
    data.getDocument(propertyKey).summary = summary;
  });

/**
 * 获取原始上下文
 * @param id
 * @param def
 */
export const OriginContext = (): ParameterDecorator =>
  annotation.exportDecorator((data, { propertyKey, parameterIndex }) => {
    const option = data.getApiArgument(propertyKey, parameterIndex);
    option.resolve = (ctx) => ctx;
  });

/**
 * 获取原始请求对象
 * @param id
 * @param def
 */
export const OriginRequest = (): ParameterDecorator =>
  annotation.exportDecorator((data, { propertyKey, parameterIndex }) => {
    const option = data.getApiArgument(propertyKey, parameterIndex);
    option.resolve = (ctx) => ctx.request;
  });

/**
 * 获取原始响应对象
 * @param id
 * @param def
 */
export const OriginResponse = (): ParameterDecorator =>
  annotation.exportDecorator((data, { propertyKey, parameterIndex }) => {
    const option = data.getApiArgument(propertyKey, parameterIndex);
    option.resolve = (ctx) => ctx.response;
  });

/**
 * 请求参数注解
 * @param option
 */
export const RequestParameter = <T>(
  option: Parameter<T>
): MethodDecorator & ParameterDecorator =>
  annotation.exportDecorator(
    (data, { target, propertyKey, parameterIndex }) => {
      // 查找文档配置
      const document = data.getDocument(propertyKey);
      let parameter: Parameter<T>;

      // BODY参数注解
      if (option.in === "body") {
        parameter = document.parameters.find(
          (param) => param.in === option.in && param.name === "body"
        );
        if (!parameter) {
          parameter = { in: "body", name: "body" };
          document.parameters.push(parameter);
        }
        if (option.name === "body") {
          Object.assign(parameter, option);
        } else {
          parameter.required = true;
          if (!parameter.schema) {
            parameter.schema = {
              type: "object",
              properties: {},
            };
          }
          parameter.schema.properties[option.name] = {
            description: option.description,
            default: option.default,
            example: option.example,
            $ref: option.$ref,
            schema: option.schema,
          };
        }
      } else {
        parameter = document.parameters.find(
          (param) => param.in === option.in && param.name === option.name
        );
        if (parameter) {
          Object.assign(parameter, option);
        } else {
          parameter = option;
          document.parameters.push(parameter);
        }
      }

      // 方法注解
      if (parameterIndex === undefined) return;

      // 类型自动检测
      if (!option.schema) {
        if (target instanceof Function) target = target.prototype;
        let type = Reflect.getMetadata(
          "design:paramtypes",
          target,
          propertyKey
        )[parameterIndex];

        switch (type) {
          case String: {
            type = "string";
            break;
          }
          case Number: {
            type = "integer";
            break;
          }
          case Boolean: {
            type = "boolean";
            break;
          }
          case Array: {
            type = "boolean";
            break;
          }
          default: {
            type = "object";
            break;
          }
        }

        if (option.in === "body" && option.name !== "body") {
          parameter.schema.properties[option.name].type = type;
        } else {
          parameter.type = type;
        }
      }

      // 注册类型处理器
      const argument = data.getApiArgument(propertyKey, parameterIndex);

      // 生成数据拾取器
      if (option.in === "body") {
        if (option.name === "body") {
          return (argument.resolve = async (ctx: Context) => {
            if (!ctx.body) ctx.body = bodyParse(ctx.req);
            const res = await ctx.body;
            if (res !== undefined) return res;
            if (!option.required) return option.default;
            const msg = "body cannot be empty";
            throw new BadRequestError(msg);
          });
        } else {
          return (argument.resolve = async (ctx: Context) => {
            if (!ctx.body) ctx.body = bodyParse(ctx.req);
            const body = await ctx.body;
            const res = body[option.name];
            if (res !== undefined) return res;
            if (!option.required) return option.default;
            const msg = `body ${option.name} cannot be empty`;
            throw new BadRequestError(msg);
          });
        }
      }

      // 默认类型转换器
      let convert: (value: string) => any;

      // 类型转换
      switch (parameter.type) {
        case "integer": {
          convert = (value: string) => Number(value);
          break;
        }
        case "boolean": {
          convert = toBoolean;
          break;
        }
        default: {
          convert = (value: string) => value;
          break;
        }
      }

      // QUERY参数
      if (option.in === "query") {
        return (argument.resolve = (ctx) => {
          const res = ctx.request.query[option.name];
          if (res !== undefined) return convert(res);
          if (!option.required) return option.default;
          const msg = `query ${option.name} cannot be empty`;
          throw new BadRequestError(msg);
        });
      }

      // PATH地址参数
      if (option.in === "path") {
        return (argument.resolve = (ctx) => {
          const res = ctx.request.method[option.name];
          if (res !== undefined) return convert(res);
          if (!option.required) return option.default;
          const msg = `path ${option.name} cannot be empty`;
          throw new BadRequestError(msg);
        });
      }

      // Header参数
      if (option.in === "header") {
        return (argument.resolve = (ctx) => {
          const res = ctx.request.header[option.name];
          if (res !== undefined) return convert(res);
          if (!option.required) return option.default;
          const msg = `header ${option.name} cannot be empty`;
          throw new BadRequestError(msg);
        });
      }
    }
  );

/**
 * 参数选项
 */
interface BaseArgumentOption<T> {
  name: string;
  description?: string;
  required?: boolean;
  default?: T;
  enum?: T[];
  example?: T;
}

/**
 * 请求PATH参数解析
 * @param name
 * @param def
 */
export const PathVariable = <T>(
  nameOrOption: string | BaseArgumentOption<T>
): ParameterDecorator => {
  // 参数定义
  const parameter: Parameter<T> & any = {
    in: "path",
  };

  // 参数处理
  if (typeof nameOrOption === "string") {
    parameter.name = nameOrOption;
  } else {
    parameter.name = nameOrOption.name;
    Object.assign(parameter, nameOrOption);
    if (nameOrOption.enum) parameter.type = "enum";
  }

  // 导出注解
  return RequestParameter(parameter);
};

/**
 * 请求Query参数解析
 * @param name
 * @param def
 */
export const RequestQurey = <T>(
  nameOrOption: string | BaseArgumentOption<T>
): ParameterDecorator => {
  // 参数定义
  const parameter: Parameter<T> & any = {
    in: "query",
  };

  // 参数处理
  if (typeof nameOrOption === "string") {
    parameter.name = nameOrOption;
  } else {
    parameter.name = nameOrOption.name;
    Object.assign(parameter, nameOrOption);
    if (nameOrOption.enum) parameter.type = "enum";
  }

  // 导出注解
  return RequestParameter(parameter);
};

/**
 * 请求Header参数解析
 * @param name
 * @param def
 */
export const RequestHeader = <T>(
  nameOrOption: string | BaseArgumentOption<T>
): ParameterDecorator => {
  // 参数定义
  const parameter: Parameter<T> & any = {
    in: "header",
  };

  // 参数处理
  if (typeof nameOrOption === "string") {
    parameter.name = nameOrOption;
  } else {
    parameter.name = nameOrOption.name;
    Object.assign(parameter, nameOrOption);
    if (nameOrOption.enum) parameter.type = "enum";
  }

  // 导出注解
  return RequestParameter(parameter);
};

/**
 * 请求Body参数注解
 * @param name
 */
export const RequestBody = (schema: {
  [key: string]: BaseSchema;
}): ParameterDecorator =>
  RequestParameter({
    in: "body",
    name: "body",
    schema: DataType.Object(schema),
  });

/**
 * 参数选项
 */
interface BodyArgumentOption<T> extends BaseArgumentOption<T> {
  name: string;
  description?: string;
  required?: boolean;
  default?: T;
  enum?: T[];
  example?: T;
  format?: "int64" | "int32" | "date-time";
  items?: BaseSchema<T>;
  $ref?: string;
  properties?: { [key: string]: BaseSchema };
  schema?: BaseSchema;
}

/**
 * 请求Body参数注解
 * @param name
 * @param def
 */
export const RequestBodyValue = <T>(
  nameOrOption: string | BodyArgumentOption<T>
): ParameterDecorator => {
  // 参数定义
  const parameter: Parameter<T> & any = {
    in: "body",
  };

  // 参数处理
  if (typeof nameOrOption === "string") {
    parameter.name = nameOrOption;
  } else {
    parameter.name = nameOrOption.name;
    Object.assign(parameter, nameOrOption);
    if (nameOrOption.enum) parameter.type = "enum";
  }

  // 导出注解
  return RequestParameter(parameter);
};

/**
 * 响应选项
 */
export interface ResponseOption {
  code: number;
  description?: string;
  type?: BaseSchema;
}

/**
 * 响应状态码注解
 * @param code
 */
export const ResponseStatus = (
  option: number | ResponseOption
): MethodDecorator => {
  if (typeof option === "number") option = { code: option };
  const { code, description, type } = option;
  return annotation.exportDecorator((data, { propertyKey }) => {
    data.getApiOption(propertyKey).responseStatus = code;
    const document = data.getDocument(propertyKey);
    if (!document.responses[code]) document.responses[code] = {};
    document.responses[code].description = description;
    if (type) document.responses[code].schema = { ...type };
  });
};
