import { Booter } from "../core";
import { createConnections, ConnectionOptions } from "typeorm";
import { RepositoryReflect } from "./annotation";

/**
 * 注册ORM模块
 */
export const register = (
  option: ConnectionOptions | ConnectionOptions[]
): Booter => async (app, next) => {
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
      console.log("[WARN]", bean.id.toString(), "无法注册为仓库");
      continue;
    }

    const metaRef = RepositoryReflect.getMetadata(beanRef);
    const { connection, entity } = metaRef.metas[0];
    const option = map[connection];

    if (!option) {
      console.log("[WARN]", connection, "数据库连接未配置");
      continue;
    }

    if (!option.entities) option.entities = [];
    option.entities.push(entity);

    if (!option.repositorys) (<any>option).repositorys = [];
    option.repositorys.push(beanRef);
  }

  // 建立连接
  const connects = await createConnections(options);
  console.log("[orm] 数据库连接成功");
  const jobs = [];

  // 注册数据仓库
  for (const connect of connects) {
    const manager =
      connect.options.type === "mongodb"
        ? connect.mongoManager
        : connect.manager;
    const { repositorys } = <any>connect.options;
    if (!repositorys) continue;

    jobs.push(
      ...repositorys.map(async (repo: any) => {
        const cusRepo = manager.getCustomRepository(repo);
        await app.resolve(cusRepo);
        app.bind(repo).toValue(cusRepo);
      })
    );
  }

  await next();
  await Promise.all(jobs);
  console.log("[orm] 数据仓库注册完成");
};
