import { Booter } from "../core";
import { createConnections, ConnectionOptions } from "typeorm";
import { RepositoryReflect } from "./annotation";
import { Logger } from "../logger";

/**
 * 注册ORM模块
 */
export const register = (
  option: ConnectionOptions | ConnectionOptions[]
): Booter => async (app, next) => {
  const logger = await app.getBean<Logger>(Logger);

  // 参数预处理
  const map: { [key: string]: ConnectionOptions & any } = {};
  const options = option instanceof Array ? option : [option];
  for (const option of options) {
    map[option.name || "default"] = option;
  }

  // 实体注册
  const beans = app.tags["repository"] || [];
  for (const bean of beans) {
    const beanRef = bean.ref;

    if (!beanRef) {
      logger.warn("plugin.orm", {
        beanId: bean.id.toString(),
        message: "无法注册为仓库",
      });
      continue;
    }

    const metaRef = RepositoryReflect.getMetadata(beanRef);
    const { connection, entity } = metaRef.metas[0];
    const option = map[connection];

    if (!option) {
      logger.warn("plugin.orm", {
        connection,
        message: "数据库连接未配置",
      });
      continue;
    }

    if (!option.entities) option.entities = [];
    option.entities.push(entity);

    if (!option.repositorys) (<any>option).repositorys = [];
    option.repositorys.push(beanRef);
  }

  // 建立连接
  const connects = await createConnections(options);
  logger.debug("plugin.orm", { message: "数据库连接成功" });

  // 注册数据仓库
  for (const connect of connects) {
    const manager =
      connect.options.type === "mongodb"
        ? connect.mongoManager
        : connect.manager;
    const { repositorys } = <any>connect.options;
    if (!repositorys) continue;

    repositorys.map(async (repo: any) => {
      const cusRepo = manager.getCustomRepository(repo);
      app.bind(repo).toFactory(async () => {
        await app.resolve(cusRepo);
        return cusRepo;
      });
    });
  }

  await next();
  logger.debug("plugin.orm", { message: "数据仓库注册完成" });
};
