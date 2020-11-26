import { Context as BaseContext } from "koa";
import { Autowride } from "../container";
import IoRedis, { Redis } from "ioredis";
import { Logger } from "../logger";
import { InternalServerError } from "./error";

/**
 * 上下文对象
 */
export interface Context extends BaseContext {
  // 路由参数
  params: {
    [key: string]: string;
  };
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
   * 处理函数
   */
  public action: Function;

  /**
   * 响应处理
   */
  public response: {
    status: number;
  };

  /**
   * 接口缓存
   */
  public cache: {
    enable: boolean;
    prefix: string;
    timeout: number;
    key: (ctx: Context) => string;
  };

  /**
   * 绑定处理器
   * @param action
   */
  public to(action: Function) {
    this.action = action;
    return this;
  }

  /**
   * 从缓存获取
   */
  protected async handleCacheRead(ctx: Context) {
    const { enable, timeout, prefix, key } = this.cache || {};
    if (!enable || !timeout) return false;
    const id = `${prefix}:${key(ctx)}`;

    try {
      const value = await this.redis.get(id);
      const { status, body } = JSON.parse(value);
      ctx.status = status;
      ctx.body = body;
      return true;
    } catch (e) {
      await this.redis.del(id);
      return false;
    }
  }

  /**
   * 写入数据到缓存
   * @param ctx
   */
  protected async handleCacheSave(ctx: Context) {
    const { enable, timeout, prefix, key } = this.cache || {};
    if (!enable || !timeout) return;
    const id = `${prefix}:${key(ctx)}`;
    try {
      await this.redis.setex(
        id,
        timeout,
        JSON.stringify({
          status: ctx.status || 200,
          body: ctx.body,
        })
      );
    } catch (err) {
      this.logger.info("controller", {
        message: "缓存写入失败",
        error: err.message,
      });
    }
  }

  /**
   * 处理请求
   * @param ctx
   */
  protected async handleRequest(ctx: Context) {
    const res = await this.action(ctx);
    if (res !== undefined) ctx.body = res;
  }

  /**
   * 执行操作
   * @param ctx
   * @param params
   */
  public async exec(ctx: Context, params: { [key: string]: string }) {
    // 挂载路由参数
    ctx.params = params;
    if (this.response?.status) {
      ctx.status = this.response.status;
    }

    // 从缓存读取数据
    const cached = await this.handleCacheRead(ctx);
    if (cached) return;

    // 执行业务处理
    try {
      await this.handleRequest(ctx);
      this.handleCacheSave(ctx);
    } catch (err) {
      if (err.status === undefined) {
        const message = err.message;
        err = new InternalServerError();
        this.logger.error("httpd", {
          message: `接口未知错误:${message}`,
          url: `${ctx.method} ${ctx.url}`,
          err,
        });
      }
      ctx.status = err.status;
      ctx.body = { message: err.message };
    }
  }
}
