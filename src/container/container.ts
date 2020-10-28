import callsite from "callsite";
import fs from "fs";
import { ID } from ".";
import { Bean } from "./bean";
import {
  AutowridReflect,
  AutowrideAnnotation,
  ComponentReflect,
} from "./annotation";
import { PropertyMetaData, MethodMetaData } from "../core/reflect";
import { dirname, join } from "path";
import { Newable } from "../core/basic";

/**
 * 容器管理对象
 */
export class Container {
  /**
   * 类对象绑定ID
   */
  protected classBindID = Symbol("ID");

  /**
   * 绑定表
   */
  protected binds: Map<ID, Bean> = new Map();

  /**
   * 标签集
   */
  protected tags: {
    [key: string]: Bean[];
  } = {};

  /**
   * 构造方法
   */
  constructor() {
    this.bind(Container).toValue(this);
  }

  /**
   * 给Bean添加标签
   * @param id
   * @param key
   */
  public tag(id: ID, ...keys: string[]) {
    const bean = this.binds.get(id);
    if (!bean) throw new Error("容器未注册");

    for (const key of keys) {
      if (!this.tags[key]) this.tags[key] = [];
      if (this.tags[key].includes(bean)) continue;
      this.tags[key].push(bean);
    }
  }

  /**
   * 注册依赖
   * @param id
   */
  public bind<T>(id: ID<T>) {
    let bean = this.binds.get(id);
    if (bean) return bean;

    // 类作为ID
    if (id instanceof Function) {
      Reflect.defineMetadata(this.classBindID, true, id);
    }

    // 创建Bean
    bean = new Bean(this, id);
    this.binds.set(id, bean);
    return bean;
  }

  /**
   * 获取依赖
   * @param id
   */
  public async getBean<T>(id: ID): Promise<T> {
    let bean = this.binds.get(id);
    if (bean !== undefined) return await bean.get();
    throw new Error("ID解析失败");
  }

  /**
   * 通过标签获取所有依赖
   * @param key
   */
  public async getBeansByTag(key: string): Promise<any[]> {
    if (!this.tags[key]) return [];
    const jobs = this.tags[key].map((bean) => bean.get());
    return await Promise.all(jobs);
  }

  /**
   * 通过ID获取
   * @param id
   */
  protected async getBeanByMetaId(id: ID | Function) {
    // 常量处理
    let state = id instanceof Function;
    if (!state) return await this.getBean(id);

    // 函数类型
    state = Reflect.getMetadata(this.classBindID, id);
    if (state) return await this.getBean(id);

    // 工厂生成
    try {
      return await (<Function>id)(this);
    } catch (e) {
      throw new Error("注入函数执行失败");
    }
  }

  /**
   * 解析属性注入
   * @param bean
   * @param key
   * @param ref
   */
  protected async resolvePropertyInject(
    bean: Object,
    key: string | symbol,
    ref: PropertyMetaData<AutowrideAnnotation>
  ) {
    const option = ref.metas[0];
    if (!option) return;

    // 基于名称注入
    if (!option.id) option.id = key;

    // 容器注入
    bean[key] = await this.getBeanByMetaId(option.id);
  }

  /**
   * 解析方法注入
   * @param bean
   * @param key
   * @param ref
   */
  protected async resolveMethodInject(
    bean: Object,
    key: string | symbol,
    ref: MethodMetaData<AutowrideAnnotation>
  ) {
    const option = ref.metas[0];
    const descriptor = ref.descriptor;
    if (!option || !descriptor) return;

    // 方法注入
    if (descriptor.value && option.id) {
      const res = await this.getBeanByMetaId(option.id);
      bean[key](res);
      return;
    }

    // Setter注入
    if (descriptor.set) {
      const res = await this.getBeanByMetaId(option.id || key);
      bean[key] = res;
      return;
    }
  }

  /**
   * 解析Bean
   * @param bean
   */
  public async resolve(bean: Object) {
    const ref = AutowridReflect.getMetadata(bean);
    if (!ref) return;
    const jobs: Promise<any>[] = [];

    // 属性注解注入
    ref.property.forEach((meta, key) =>
      jobs.push(this.resolvePropertyInject(bean, key, meta))
    );

    // 方法注解注入
    ref.method.forEach((meta, key) =>
      jobs.push(this.resolveMethodInject(bean, key, meta))
    );

    // 等待全部
    await Promise.all(jobs);
  }

  /**
   * 注册组件
   * @param target
   */
  public register(target: Newable<any>) {
    const meta = ComponentReflect.getMetadata(target);
    if (!meta) return;

    // 参数解析
    const { id, tags } = meta.metas[0];

    // 类型绑定
    this.bind(id || target)
      .to(target)
      .tag(...tags);
  }

  /**
   * 扫描自动载入
   * @param path
   */
  public scan(path: string) {
    if (path[0] !== "/") {
      const stack = callsite()[1].getFileName();
      path = join(dirname(stack), path);
    }

    // 文件不存在
    if (!fs.existsSync(path)) return;

    // 路径是目录
    if (fs.statSync(path).isDirectory()) {
      const res = fs.readdirSync(path);
      res.forEach((name) => this.scan(join(path, name)));
      return;
    }

    // 文件处理
    const names = path.split(".");
    if (names.length !== 2) return;
    if (!["ts", "js"].includes(names.pop())) return;

    // 引用文件
    const required = require(path);
    for (const key in required) {
      const target = required[key];
      if (typeof target !== "function") continue;
      this.register(target);
    }
  }
}
