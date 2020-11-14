import { Booter } from "../core";
import IoRedis, { RedisOptions } from "ioredis";

/**
 * 注册Redis模块
 */
export const register = (option: RedisOptions): Booter => async (app, next) => {
  const redis = new IoRedis(option);
  app.bind(IoRedis).toValue(redis);
  await next();
};
