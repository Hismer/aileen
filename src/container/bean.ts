import { ID } from ".";
import { Newable } from "../core/basic";
import { Container } from "./container";

/**
 * 依赖注入工厂
 */
export type Factory<T = any> = (container: Container) => T | Promise<T>;

/**
 * 依赖注入实例
 */
export class Bean<T = any> {
  /**
   * 依赖注入标识
   */
  private id: ID;

  /**
   * 所属依赖容器
   */
  private container: Container;

  /**
   * 实例创建工厂
   */
  private factory: Factory;

  /**
   * 是否是单一实例
   */
  private singleton = true;

  /**
   * 已创建实例
   */
  private entity: Promise<T>;

  /**
   * 构造方法
   * @param container
   */
  constructor(container: Container, id: ID) {
    this.id = id;
    this.container = container;
  }

  /**
   * 是否为单一例对象
   * @param status
   */
  public isSingleton(status: boolean) {
    this.singleton = status;
    return this;
  }

  /**
   * 创建新对象
   */
  public async create() {
    // 未绑定处理器
    if (this.factory === undefined) throw new Error("未绑定依赖");

    // 运行处理器
    let entity = await this.factory(this.container);
    if (entity instanceof Object) {
      await this.container.resolve(entity);
    }

    // 响应实体
    return entity;
  }

  /**
   * 获取实例
   */
  public get(): Promise<T> {
    // 缓存处理
    if (this.entity !== undefined) return this.entity;

    // 创建实体
    const entity = this.create();

    // 单例缓存
    if (this.singleton) this.entity = entity;

    // 响应实体
    return entity;
  }

  /**
   * 绑定到构造类
   * @param constructor
   */
  to<T>(constructor: Newable<T>) {
    this.entity = undefined;
    this.factory = (): any => new constructor();
    return this;
  }

  /**
   * 绑定自身
   */
  public toSelf(): Bean {
    return this.to(<any>this.id);
  }

  /**
   * 绑定动态值
   * @param value
   */
  public toValue(value: T): Bean {
    this.entity = undefined;
    this.factory = () => value;
    return this;
  }

  /**
   * 绑定工厂
   * @param fun
   */
  public toFactory(fun: Factory): Bean {
    this.entity = undefined;
    this.factory = fun;
    return this;
  }

  /**
   * 添加标签
   * @param keys
   */
  public tag(...keys: string[]): Bean {
    this.container.tag(this.id, ...keys);
    return this;
  }
}
