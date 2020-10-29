import { Booter } from "../core";
import { TaskReflect } from "./annotation";
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
  const schedules = await app.getBeansByTag("schedule");

  // 注册定时器
  for (const sch of schedules) {
    const ref = TaskReflect.getMetadata(sch);
    ref.method.forEach((meta, key) => {
      const { cron } = meta.metas[0];
      const action = sch[key].bind(sch);
      schedule.scheduleJob(cron, action);
    });
  }
};
