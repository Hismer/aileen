import { HTTPMethod } from "trouter";
import { Context } from "koa";
import { SwaggerDoc, SwaggerApi } from "./swagger";
import { Autowride } from "../container";
import IoRedis, { Redis } from "ioredis";
import { Logger } from "../logger";

/**
 * 路由参数
 */
export interface Option {
  host?: string;
  path: string;
  method: HTTPMethod;
  action?: Function;
}

/**
 * 缓存选项
 */
export interface CacheOption {
  timeout: number;
  key: (ctx: Context) => string;
}

export class Route {
  @Autowride(IoRedis)
  protected redis: Redis;

  @Autowride(Logger)
  protected logger: Logger;

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
   * 接口缓存
   */
  protected _cache?: CacheOption;

  /**
   * 设置缓存
   * @param option
   */
  public cache(option: CacheOption) {
    this._cache = option;
    return this;
  }

  /**
   * 接口文档
   */
  public readonly doc: SwaggerApi = {
    tags: [],
    parameters: [],
    responses: {},
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
    // 方法未绑定
    if (!this._action) {
      ctx.status = 404;
      return;
    }

    // 从缓存读取数据
    let key: string;
    if (this._cache) {
      key = `controller:${this._cache.key(ctx)}`;
      try {
        const value = await this.redis.get(key);
        const { status, body } = JSON.parse(value);
        ctx.status = status;
        ctx.body = body;
        return;
      } catch (e) {
        await this.redis.del(key);
      }
    }

    // 执行数据操作
    try {
      await this._action(ctx);
      if (this._cache) {
        const value = JSON.stringify({
          status: ctx.status || 200,
          body: ctx.body || {},
        });
        this.redis.setex(key, this._cache.timeout, value).catch((err) =>
          this.logger.info("controller", {
            message: "缓存写入失败",
            error: err.message,
          })
        );
      }
    } catch (err) {
      ctx.status = 500;
      ctx.body = {
        message: "未知错误",
      };
      this.logger.info("controller", {
        message: "控制器执行出错",
        error: err.message,
      });
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
