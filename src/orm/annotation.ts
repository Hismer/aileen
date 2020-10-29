import { Component } from "../container";
import { AnnotationReflect } from "../core/reflect";
import {
  EntitySchema,
  EntityRepository as BaseEntityRepository,
} from "typeorm";

/**
 * 实体反射器
 */
export const RepositoryReflect = new AnnotationReflect<{
  connection: string;
  entity: Function | EntitySchema<any>;
}>();

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
  // 生成注解
  return function (target: Function) {
    BaseEntityRepository(entity)(target);
    Component({ tags: ["repository"] })(target);
    RepositoryReflect.defineMetadata({
      target,
      connection,
      entity,
    });
  };
}
