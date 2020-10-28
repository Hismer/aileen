import Trouter, { HTTPMethod } from "trouter";
import { Context } from "koa";
import { ID, Autowride, Container, Component } from "../container";
const INITD_TAG = Symbol("INITD");

/**
 * 路由对象
 */
@Component()
export class Router {
  @Autowride(Container)
  protected container: Container;

  // 解析引擎
  protected engine = new Trouter();

  // 控制器
  protected controllers: ID[] = [];

  /**
   * 注册路由
   * @param method
   * @param url
   * @param callback
   */
  public register(
    method: HTTPMethod,
    url: string,
    callback: (ctx: Context) => any
  ) {
    this.engine.add(method, url, callback);
  }

  /**
   * 绑定GET请求
   * @param controller
   * @param method
   */
  public async bindRequest(
    method: HTTPMethod,
    path: string,
    id: ID,
    action: string
  ) {
    console.log("[router] register", method, path);
    if (this.controllers.includes(id)) {
      const control = await this.container.getBean<any>(id);
      const act = control[action].bind(control);
      this.register(method, path, act);
      return;
    }
    this.controllers.push(id);
    const control = await this.container.getBean<any>(id);
    if (control.init instanceof Function) await control.init();
    const act = control[action].bind(control);
    this.register(method, path, act);
  }

  /**
   * 绑定GET
   * @param path
   * @param controller
   * @param action
   */
  public bindGET(path: string, controller: any, action: string) {
    this.bindRequest("GET", path, controller, action);
  }

  /**
   * 绑定POST
   * @param path
   * @param controller
   * @param action
   */
  public bindPOST(path: string, controller: any, action: string) {
    this.bindRequest("POST", path, controller, action);
  }

  /**
   * 绑定PATCH
   * @param path
   * @param controller
   * @param action
   */
  public bindPATCH(path: string, controller: any, action: string) {
    this.bindRequest("PATCH", path, controller, action);
  }

  /**
   * 绑定PUT
   * @param path
   * @param controller
   * @param action
   */
  public bindPUT(path: string, controller: any, action: string) {
    this.bindRequest("PUT", path, controller, action);
  }

  /**
   * 绑定DELETE
   * @param path
   * @param controller
   * @param action
   */
  public bindDELETE(path: string, controller: any, action: string) {
    this.bindRequest("DELETE", path, controller, action);
  }

  /**
   * 执行请求
   * @param method
   * @param url
   */
  public async handle(ctx: Context) {
    const { handlers, params } = this.engine.find(
      <HTTPMethod>ctx.method,
      ctx.path
    );
    if (!handlers.length) return;
    ctx.param = params;
    await handlers[0](ctx);
  }
}
