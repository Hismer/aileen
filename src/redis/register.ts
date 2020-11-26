import { Booter } from "../core";
import IoRedis, { RedisOptions } from "ioredis";

/**
 * 注册Redis模块
 */
export const register = (option: RedisOptions): Booter => async (app, next) => {
  app.bind(IoRedis).toFactory(() => new IoRedis(option));
  await next();
};
