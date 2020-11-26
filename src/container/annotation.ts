import { ID } from "./index";
import { Annotation } from "../core/annotation";

/**
 * 可注入配置
 */
export class InjectableConfig {
  /**
   * 注册ID
   */
  public id: ID;

  /**
   * 属性注入
   */
  public readonly propertyResolves: {
    [key: string]: ID;
  } = {};

  /**
   * 方法注入
   */
  public readonly methodResolves: {
    [key: string]: ID;
  } = {};
}

// 创建注解
const builder = () => new InjectableConfig();
export const annotation = new Annotation(builder);

/**
 * 组件申明
 */
export interface ComponentOption {
  id?: ID;
}

/**
 * 自动解析注解
 * @param id
 */
export const Component = (id?: ID): ClassDecorator =>
  annotation.exportDecorator((data, { target }) => {
    if (id) data.id = id;
    else data.id = <Function>target;
  });

/**
 * 自动解析注解
 * @param id
 */
export const Autowride = (id: ID): PropertyDecorator & MethodDecorator =>
  annotation.exportDecorator((data, { type, propertyKey }) => {
    const key = propertyKey.toString();
    if (type === "Property") data.propertyResolves[key] = id;
    else if (type === "Method") data.methodResolves[key] = id;
  });
