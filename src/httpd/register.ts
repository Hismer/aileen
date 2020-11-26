import { Router, Option } from "./router";
import { Logger } from "../logger";
import { Booter } from "../core";
import { annotation } from "./annotation";
import Koa from "koa";

/**
 * 注册启动器
 * @param app
 */
export const register = (option: Option): Booter => async (app, next) => {
  app.bind(Koa).toSelf();
  app.bind(Router).toFactory(async () => {
    const router = new Router(option);
    await app.resolve(router);
    return router;
  });

  // 执行后续操作
  await next();

  // 载入路由
  const router = await app.getBean<Router>(Router);
  const registers: Promise<any>[] = [];
  for (const { type, target } of annotation.registered) {
    if (type !== "Class") continue;
    registers.push(router.registerController(<Function>target));
  }

  // 启动应用
  await Promise.all(registers);
  await router.start();

  // 打印日志
  const logger = await app.getBean<Logger>(Logger);
  logger.info("plugin.httpd.started", {
    enable: router.enable,
    listen: router.port,
  });
};
