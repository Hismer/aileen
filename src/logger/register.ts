import { Booter } from "../core";
import { Logger, Options } from "./logger";

/**
 * 注册日志服务
 * @param app
 */
export const register = (option: Options): Booter => async (app, next) => {
  const logger = new Logger(option);
  app.bind(Logger).toValue(logger);
  await next();
};
