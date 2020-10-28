import { ID } from "./index";
import { Factory } from "./bean";
import { AnnotationReflect } from "../core/reflect";

/**
 * 参数注入注解申明
 */
export interface InjectAnnotation {
  id?: ID | Factory;
}

/**
 * 参数注入注解对象
 */
export const InjectReflect = new AnnotationReflect<InjectAnnotation>();

/**
 * 参数注入注解
 * @param id
 */
export const inject = (id?: ID | Factory) => (
  target: Object,
  propertyKey: string,
  parameterIndex: number
) => {
  AutowridReflect.defineMetadata({
    id,
    target,
    propertyKey,
    parameterIndex,
  });
};

/**
 * 自动解析接口
 */
export interface AutowrideAnnotation {
  id?: ID | Factory;
}

/**
 * 申明注解对象
 */
export const AutowridReflect = new AnnotationReflect<AutowrideAnnotation>();

/**
 * 自动解析注解
 * @param id
 */
export const Autowride = (id?: ID | Factory) => (
  target: Object,
  propertyKey: string,
  descriptor?: PropertyDescriptor
) => {
  AutowridReflect.defineMetadata({
    id,
    target,
    propertyKey,
    descriptor,
  });
};

/**
 * 组件注入注解申明
 */
export interface ComponentAnnotation {
  id?: ID;
  tags?: string[];
}

/**
 * 参数注入注解对象
 */
export const ComponentReflect = new AnnotationReflect<ComponentAnnotation>();

/**
 * 自动解析注解
 * @param id
 */
export const Component = (options: ComponentAnnotation = {}) => (
  target: Function
) => {
  ComponentReflect.defineMetadata({
    target,
    tags: [],
    ...options,
  });
};
