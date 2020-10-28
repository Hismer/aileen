import { AnnotationReflect } from "../core/reflect";
import { Component } from "../container";
import { HTTPMethod } from "trouter";

/**
 * 组件注入注解申明
 */
export interface ControllerAnnotation {
  path?: string;
  tag?: string;
  tags?: string[];
}

/**
 * 控制器注解对象
 */
export const ControllerReflect = new AnnotationReflect<ControllerAnnotation>();

/**
 * 控制器解析注解
 * @param id
 */
export const Controller = (options: ControllerAnnotation = {}) => (
  target: Function
) => {
  Component({ tags: ["controller"] })(target);
  ControllerReflect.defineMetadata({
    target,
    path: "/",
    ...options,
  });
};

/**
 * HTTP接口
 */
export interface HttpAnnotation {
  method?: HTTPMethod;
  path?: string;
  tags?: string[];
  summary?: string;
  description?: string;
}

/**
 * 申明注解对象
 */
export const HttpReflect = new AnnotationReflect<HttpAnnotation>();

/**
 * HTTP请求注解
 * @param id
 */
export const HTTP = (option: HttpAnnotation) => (
  target: Object,
  propertyKey: string,
  descriptor?: PropertyDescriptor
) => {
  if (!option.path) option.path = "";
  HttpReflect.defineMetadata({
    target,
    propertyKey,
    descriptor,
    ...option,
  });
};

// 请求方法注解
export const GET = (path?: string) => HTTP({ method: "GET", path });
export const POST = (path?: string) => HTTP({ method: "POST", path });
export const PUT = (path?: string) => HTTP({ method: "PUT", path });
export const PATCH = (path?: string) => HTTP({ method: "PATCH", path });
export const DELETE = (path?: string) => HTTP({ method: "DELETE", path });

// 文档申明注解
export const Tags = (...names: string[]) => HTTP({ tags: names });
export const Description = (description: string) => HTTP({ description });
export const Summary = (summary: string) => HTTP({ summary });
