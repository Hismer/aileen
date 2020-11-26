import { Booter } from "../core";
import { annotation } from "./annotation";
import schedule from "node-schedule";

/**
 * 插件配置项
 */
export interface Option {
  enable?: boolean;
}

/**
 * 注册启动器
 * @param app
 */
export const register = (option: Option = {}): Booter => async (app, next) => {
  await next();
  if (!option.enable) return;

  // 获取所有定时器
  for (const { type, target } of annotation.registered) {
    if (type !== "Class") continue;
    const controller = await app.getBean(<any>target);
    const ref = annotation.getRef(controller);
    for (const key in ref.tasks) {
      const action = controller[key].bind(controller);
      for (const cron of ref.tasks[key]) {
        schedule.scheduleJob(cron, action);
      }
    }
  }
};
