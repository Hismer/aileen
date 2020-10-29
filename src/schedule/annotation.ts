import { AnnotationReflect } from "../core/reflect";
import { Component } from "../container";

/**
 * 任务实例注解
 * @param option
 */
export const Schedule = () => (target: Function) => {
  Component({ tags: ["schedule"] })(target);
};

/**
 * 组件注入注解申明
 */
export interface TaskAnnotation {
  cron: string;
}

/**
 * 任务注解对象
 */
export const TaskReflect = new AnnotationReflect<TaskAnnotation>();

/**
 * 任务实例注解
 * @param option
 */
export const Task = (option: string | TaskAnnotation) => (
  target: Object,
  propertyKey: string,
  descriptor?: PropertyDescriptor
) => {
  const options = typeof option === "string" ? { cron: option } : option;
  TaskReflect.defineMetadata({
    target,
    propertyKey,
    descriptor,
    ...options,
  });
};
