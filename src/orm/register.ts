import { Booter } from "../core";
import {
  createConnections,
  ConnectionOptions,
  MongoEntityManager,
  EntityManager,
} from "typeorm";
import { annotation } from "./annotation";
import { Logger } from "../logger";

/**
 * ORM管理器
 */
interface Managers {
  [key: string]: MongoEntityManager | EntityManager;
}

/**
 * 数据库连接器
 * @param options
 */
const connect = async (options: ConnectionOptions[]): Promise<Managers> => {
  const connects = await createConnections(options);
  const managers: Managers = {};
  for (const connect of connects) {
    managers[connect.name] =
      connect.options.type === "mongodb"
        ? connect.mongoManager
        : connect.manager;
  }
  return managers;
};

/**
 * 注册ORM模块
 */
export const register = (
  option: ConnectionOptions | ConnectionOptions[]
): Booter => async (app, next) => {
  // 参数预处理
  const optionMap: { [key: string]: ConnectionOptions & any } = {};
  const options = option instanceof Array ? option : [option];
  for (const option of options) {
    optionMap[option.name || "default"] = option;
    if (!option.entities) (<any>option).entities = [];
  }

  // 注册实体
  for (const { type, target } of annotation.registered) {
    if (type !== "Class") continue;
    const ref = annotation.getRef(target);
    const option = optionMap[ref.connection];
    option.entities.push(ref.entity);
  }

  // 发起连接
  const connection = connect(options);

  // 注册数据仓
  for (const { type, target } of annotation.registered) {
    if (type !== "Class") continue;
    const ref = annotation.getRef(target);
    app.bind(<Function>target).toFactory(async () => {
      const managers = await connection;
      const cusRepo = managers[ref.connection].getCustomRepository(<any>target);
      await app.resolve(cusRepo);
      return cusRepo;
    });
  }

  // 执行后续操作
  await next();
  await connection;

  // 日志输出
  const logger = await app.getBean<Logger>(Logger);
  logger.debug("plugin.orm", { message: "数据库连接成功" });
};
