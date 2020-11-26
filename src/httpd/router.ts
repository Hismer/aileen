import Trouter from "trouter";
import { Autowride, Container, Component } from "../container";
import { annotation } from "./annotation";
import { sync as readPkg } from "read-pkg";
import { Route, Context } from "./route";
import Koa, { Middleware } from "koa";
import { Doc } from "./swagger";
import { koaSwagger } from "koa2-swagger-ui";
import { HTTPMethod } from "trouter";

export interface Option {
  /**
   * 主机名
   */
  host: string;

  /**
   * 端口号,默认7001
   */
  port?: number;

  /**
   * 是否启用,默认true
   */
  enable?: boolean;

  /**
   * 中间件,默认[]
   */
  middleware?: Middleware[];

  /**
   * 站点信息,默认从package.json读取
   */
  info: {
    version?: string;
    description?: string;
    title?: string;
  };

  /**
   * 缓存设置,默认不启用
   */
  cache?: {
    enable?: boolean;
    prefix?: string;
  };

  /**
   * 文档设置
   */
  document?: {
    enable?: boolean;
    homePage?: string;
    url?: string;
  };
}

/**
 * 路由对象
 */
@Component()
export class Router {
  @Autowride(Container)
  protected container: Container;

  @Autowride(Koa)
  protected server: Koa;

  /**
   * 启动任务
   */
  protected staringJob: Promise<void>;

  /**
   * 解析引擎
   */
  protected engine = new Trouter<Route>();

  /**
   * 404处理器
   */
  protected noFoundHandle: (ctx: Context) => any = (ctx) => {
    ctx.status = 404;
    ctx.body = { message: "接口不存在" };
  };

  /**
   * 设置404处理器
   * @param handle
   */
  public onNoFound(handle: (ctx: Context) => any) {
    this.noFoundHandle = handle;
    return this;
  }

  /**
   * 主机名
   */
  protected _host: string;

  /**
   * 端口号
   */
  protected _port: number;
  public get port() {
    return this._port;
  }

  /**
   * 是否启动
   */
  protected _enable: boolean;
  get enable() {
    return this._enable;
  }

  /**
   * 中间件
   */
  protected _middleware: Middleware[];

  /**
   * 信息
   */
  protected _info: Doc;

  /**
   * 缓存
   */
  protected _cache: {
    enable: boolean;
    prefix: string;
  };

  /**
   * 文档
   */
  protected _document: {
    enable: boolean;
    homePage: string;
    url: string;
  };

  /**
   * 构造方法
   * @param option
   */
  constructor(option: Option) {
    this._host = option.host || "*";
    this._port = option.port || 7001;
    this._enable = option.enable === undefined ? true : option.enable;
    const pkg = readPkg();

    // 中间件
    this._middleware = option.middleware || [];

    // 包信息
    this._info = {
      swagger: "2.0",
      schemes: ["https", "http"],
      host: option.host,
      info: {
        description: option.info?.description || pkg.description,
        version: option.info?.version || pkg.version,
        title: option.info?.title || pkg.name,
      },
      tags: [],
      paths: {},
      definitions: {},
    };

    // 缓存配置
    this._cache = {
      enable: option.cache?.enable === undefined ? false : option.cache?.enable,
      prefix: option.cache?.prefix || `${pkg.name}:httpd:cache`,
    };

    // 文档配置
    this._document = {
      enable:
        option.document?.enable === undefined ? false : option.document?.enable,
      homePage: option.document?.homePage || `/doc`,
      url: option.document?.url || `/doc.json`,
    };
  }

  /**
   * 启动服务
   */
  public start(): Promise<void> {
    // 已经启动
    if (this.staringJob) return this.staringJob;

    // 挂载中间件
    for (const middleware of this._middleware) {
      this.server.use(middleware);
    }

    // 启动文档
    if (this._document.enable) {
      const { homePage, url } = this._document;
      this.bind("GET", url).to(() => this._info);
      this.server.use(
        koaSwagger({
          routePrefix: homePage,
          hideTopbar: true,
          title: this._info.info.title,
          swaggerOptions: { url },
        })
      );
    }

    // 挂载路由
    this.server.use(async (ctx: Context) => {
      const { handlers, params } = this.engine.find(<any>ctx.method, ctx.path);
      if (!handlers.length) return await this.noFoundHandle(ctx);
      await handlers[0].exec(ctx, params);
    });

    // 创建任务
    this.staringJob = new Promise((resolve, reject) => {
      if (!this._enable) return resolve();
      this.server.listen(this._port, resolve);
      this.server.onerror = reject;
    });

    // 响应任务
    return this.staringJob;
  }

  /**
   * 添加文档TAG
   * @param name
   */
  protected appendDocTag(tag: string) {
    for (const { name } of this._info.tags) {
      if (name === tag) return;
    }
    this._info.tags.push({
      name: tag,
    });
  }

  /**
   * 注册路由
   * @param method
   * @param url
   * @param callback
   */
  public async registerController(controller: Function) {
    const bean = await this.container.getBean(controller);
    const ref = annotation.getRef(controller);

    // 文档数据生成
    for (const tag of ref.tags) {
      this.appendDocTag(tag);
    }

    // 接口注册
    for (const key in ref.mappers) {
      const route = new Route();
      await this.container.resolve(route);
      const option = ref.getApiOption(key);

      // 生成处理器
      const argumentHandles = ref.apiArguments[key];
      let action = bean[key].bind(bean);

      // 参数预处理
      if (argumentHandles) {
        const handles: Array<(ctx: Context) => any> = [];
        for (let i = 0; i < argumentHandles.length; i++) {
          const handle = argumentHandles[i];
          if (handle && handle.resolve instanceof Function) {
            handles[i] = handle.resolve;
          } else {
            handles[i] = () => undefined;
          }
        }
        const handle = action;
        action = async (ctx: Context) => {
          const args = await Promise.all(handles.map((handle) => handle(ctx)));
          return await handle(...args);
        };
      }

      // 绑定处理器
      route.to(action);

      // 缓存配置
      route.cache = {
        enable: this._cache.enable,
        prefix: this._cache.prefix,
        timeout: option.cachedTimeout,
        key: option.cachedKey,
      };

      // 响应状态
      route.response = {
        status: option.responseStatus,
      };

      // 接口文档生成
      const apiDoc = ref.getDocument(key);
      apiDoc.tags.push(...ref.tags);
      apiDoc.tags.filter((v, i) => apiDoc.tags.indexOf(v, 0) === i);

      // 注册路由
      for (const { method, path } of ref.mappers[key]) {
        const url = ref.basePath + path;
        this.engine.add(method, url, route);
        if (!this._info.paths[url]) this._info.paths[url] = {};
        this._info.paths[url][method.toLowerCase()] = apiDoc;
      }
    }
  }

  /**
   * 绑定路由
   * @param method
   * @param path
   */
  public bind(method: HTTPMethod, path: string) {
    const route = new Route();
    this.engine.add(method, path, route);
    return route;
  }
}
