import { Newable, Abstract } from "../core/basic";

/**
 * 标识符
 */
export type ID<T = any> = string | symbol | Newable<T> | Abstract<T>;

/**
 * 导入容器
 */
export * from "./container";

/**
 * 导出注解
 */
export * from "./annotation";
