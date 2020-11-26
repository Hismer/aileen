import { Annotation } from "../core";
import { Component } from "../container";

/**
 * 定时任务配置
 */
export class ScheduleConfig {
  /**
   * 任务对象
   */
  public tasks: {
    [key: string]: string[];
  } = {};
}

// 创建注解
const builder = () => new ScheduleConfig();
export const annotation = new Annotation(builder);

/**
 * 任务实例注解
 * @param option
 */
export const Schedule = (): ClassDecorator =>
  annotation.exportDecorator(() => {}, Component());

/**
 * 任务实例注解
 * @param cron
 */
export const Task = (cron: string): MethodDecorator =>
  annotation.exportDecorator((data, { propertyKey }) => {
    const key = propertyKey.toString();
    if (!data.tasks[key]) data.tasks[key] = [];
    data.tasks[key].push(cron);
  });
