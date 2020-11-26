import { Annotation } from "../core/annotation";
import {
  EntitySchema,
  EntityRepository as BaseEntityRepository,
} from "typeorm";

/**
 * 仓库注解配置
 */
export class RepositoryConfig {
  connection: string;
  entity: Function | EntitySchema<any>;
}

// 创建注解
const builder = () => new RepositoryConfig();
export const annotation = new Annotation(builder);

/**
 * 注解声明
 */
export function EntityRepository(
  entity: Function | EntitySchema<any>
): ClassDecorator;
export function EntityRepository(
  connect: string,
  entity?: Function | EntitySchema<any>
): ClassDecorator;

/**
 * 实体仓库注解
 * @param entity
 */
export function EntityRepository(
  connectionOrEntity: string | Function | EntitySchema<any>,
  maybeEntity?: Function | EntitySchema<any>
): ClassDecorator {
  // 参数解析
  let entity: Function | EntitySchema<any>, connection: string;
  if (typeof connectionOrEntity === "string") {
    connection = connectionOrEntity;
    entity = maybeEntity;
  } else {
    connection = "default";
    entity = connectionOrEntity;
  }

  // 注解生成
  return annotation.exportDecorator((data, { target }) => {
    data.connection = connection;
    data.entity = entity;
  }, BaseEntityRepository(entity));
}
