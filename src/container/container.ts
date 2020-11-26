import callsite from "callsite";
import fs from "fs";
import { ID } from ".";
import { Bean } from "./bean";
import { dirname, join } from "path";
import { Newable } from "../core/basic";
import { annotation } from "./annotation";

/**
 * 容器管理对象
 */
export class Container {
  /**
   * 绑定表
   */
  protected binds: Map<ID, Bean> = new Map();

  /**
   * 标签集
   */
  public readonly tags: {
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
   * 解析Bean
   * @param bean
   */
  public async resolve(bean: Object) {
    const ref = annotation.getRef(bean);
    if (!ref) return;

    // 异步注入器
    const jobs: Promise<any>[] = [];
    const injectProperty = async (key: string) => {
      const rely = await this.getBean(ref.propertyResolves[key]);
      bean[key] = rely;
    };
    const injectMethod = async (key: string) => {
      const rely = await this.getBean(ref.methodResolves[key]);
      bean[key](rely);
    };

    // 属性注解注入
    for (const key in ref.propertyResolves) {
      jobs.push(injectProperty(key));
    }

    // 方法注解注入
    for (const key in ref.methodResolves) {
      jobs.push(injectMethod(key));
    }

    // 等待全部
    await Promise.all(jobs);
    return bean;
  }

  /**
   * 注册组件
   * @param target
   */
  public register(target: Newable<any>) {
    const ref = annotation.getRef(target);
    if (!ref || !ref.id) return;
    this.bind(ref.id).to(target);
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
