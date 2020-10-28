import { HTTPMethod } from "trouter";
import { Context } from "koa";
import { SwaggerDoc, SwaggerApi } from "./swagger";

export interface Option {
  host?: string;
  path: string;
  method: HTTPMethod;
  action?: Function;
}

export class Route {
  /**
   * 支持域名
   */
  protected _host: string;
  get host() {
    return this._host;
  }

  /**
   * 请求路径
   */
  protected _path: string;
  get path() {
    return this._path;
  }

  /**
   * 请求方法
   */
  protected _method: HTTPMethod;
  get method() {
    return this._method;
  }

  /**
   * 处理函数
   */
  protected _action: Function;

  /**
   * 接口文档
   */
  public readonly doc: SwaggerApi = {
    tags: [],
  };

  /**
   * 绑定处理器
   * @param action
   */
  public to(action: Function) {
    this._action = action;
    return this;
  }

  /**
   * 构造方法
   * @param option
   */
  constructor(option: Option) {
    this._host = option.host || "*";
    this._method = option.method;
    this._path = option.path;
    this._action = option.action;
  }

  /**
   * 匹配路由
   * @param ctx
   */
  public match(ctx: Context): boolean {
    if (this._host !== "*") return true;
    return this._host !== ctx.host;
  }

  /**
   * 执行操作
   * @param ctx
   */
  public async handle(ctx: Context) {
    if (!this._action) {
      ctx.status = 404;
      return;
    }
    try {
      await this._action(ctx);
    } catch (err) {
      console.log("[error]", err);
    }
  }

  /**
   * 生成文档
   * @param doc
   */
  public swaggerDoc(doc: SwaggerDoc) {
    // 标签处理
    for (const tag of this.doc.tags) {
      const res = doc.tags.find((name) => name === tag);
      if (res) continue;
      doc.tags.push({ name: tag });
    }
    // 首次申明
    if (!doc.paths[this.path]) {
      doc.paths[this.path] = {};
    }
    // 注册文档
    const path = doc.paths[this.path];
    const method = this.method.toLowerCase();
    if (!path[method]) path[method] = this.doc;
  }
}
