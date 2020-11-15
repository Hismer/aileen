import Trouter, { HTTPMethod } from "trouter";
import { Context } from "koa";
import { Autowride, Container, Component } from "../container";
import { Route } from "./route";
import { SwaggerDoc, SwaggerModal } from "./swagger";

/**
 * 文档模型声明
 */
const docDefinitions: {
  [key: string]: SwaggerModal;
} = {};

/**
 * 模型申明函数
 * @param name
 * @param option
 */
export const modelDefinitions = (name: string, option: SwaggerModal) => {
  docDefinitions[name] = option;
  return `#/definitions/${name}`;
};

/**
 * 路由对象
 */
@Component()
export class Router {
  @Autowride(Container)
  protected container: Container;

  /**
   * 解析引擎
   */
  protected engine = new Trouter<Route>();

  /**
   * 路由集合
   */
  protected routes: Route[] = [];

  /**
   * 注册路由
   * @param method
   * @param url
   * @param callback
   */
  public register(route: Route) {
    this.routes.push(route);
    this.engine.add(route.method, route.path, route);
    return route;
  }

  /**
   * 绑定路由
   * @param method
   * @param path
   */
  public bind(method: HTTPMethod, path: string) {
    const route = new Route({ method, path });
    return this.register(route);
  }

  /**
   * 执行请求
   * @param method
   * @param url
   */
  public async handle(ctx: Context) {
    // 查找路由
    const { handlers, params } = this.engine.find(
      <HTTPMethod>ctx.method,
      ctx.path
    );

    // 参数写入
    ctx.param = params;

    // 匹配路由
    for (const route of handlers) {
      if (!route.match(ctx)) continue;
      return await route.handle(ctx);
    }

    // 匹配失败
    ctx.status = 404;
    ctx.body = { message: "资源不存在" };
  }

  /**
   * 生成Swagger文档
   */
  public getSwaggerDoc() {
    // 文档结构
    const doc: SwaggerDoc = {
      swagger: "2.0",
      schemes: ["https", "http"],
      host: "*",
      info: {
        description: "描述",
        version: "2.0.0",
        title: "标题",
      },
      tags: [],
      paths: {},
      definitions: docDefinitions,
    };
    // 循环生成
    for (const route of this.routes) {
      route.swaggerDoc(doc);
    }
    // 返回结果
    return doc;
  }
}
