import Koa from "koa";
import cors from "koa2-cors";
import body from "koa-body";
import compress from "koa-compress";
import { koaSwagger } from "koa2-swagger-ui";
import { Router } from "./router";
import { Booter } from "../core";
import { Context, Next } from "koa";
import { ControllerReflect, HttpReflect, HttpAnnotation } from "./annotation";
import { Application } from "../core";
import { Logger } from "../logger";

/**
 * BODY解析器
 */
const bodyParser = body({
  multipart: true,
  formidable: { maxFileSize: 5 * 1024 * 1024 * 1024 },
});

/**
 * 数据压缩器
 */
const compressor = compress({
  threshold: 2048,
  filter: (type) => /text/i.test(type),
});

/**
 * 插件配置项
 */
export interface Option {
  port?: number;
  debug?: boolean;
  enableDoc?: boolean;
  cache?: {
    enable: boolean;
    prefix: string;
  };
}

/**
 * 注册路由
 * @param app
 * @param option
 * @param router
 * @param ctl
 */
const bindRouter = async (
  app: Application,
  option: Option,
  router: Router,
  ctl: any
) => {
  // 反射控制器
  const ctlRef = ControllerReflect.getMetadata(ctl);
  if (!ctlRef) return;

  // 标签生成
  const ctlTags = ctlRef.metas[0].tags || [];
  if (ctlRef.metas[0].tag) ctlTags.push(ctlRef.metas[0].tag);
  if (!ctlTags.length) ctlTags.push((<Function>ctlRef.target).name);

  // 基础路径
  const basePath = ctlRef.metas[0].path;

  // 控制器初始化
  if (ctl.init instanceof Function) await ctl.init();

  // 反射方法
  const httpRef = HttpReflect.getMetadata(ctl);
  if (!httpRef) return;

  // 任务队列
  const jobs: Promise<any>[] = [];

  // 注册路由
  httpRef.method.forEach((meta, key) => {
    const { method, path, tags, summary, description, cache } = <
      HttpAnnotation
    >Object.assign({}, ...meta.metas);

    // 注册路由
    const route = router.bind(method, basePath + path);
    route.to(ctl[key].bind(ctl));

    // 注册依赖
    jobs.push(app.resolve(route));

    // 注册缓存
    if (option.cache && option.cache.enable && cache)
      route.cache({
        ...cache,
        key: (ctx) => `${option.cache.prefix}:${cache.key(ctx)}`,
      });

    // 文档声明
    route.doc.tags.push(...ctlTags, ...(tags || []));
    route.doc.description = description;
    route.doc.summary = summary || key.toString();
  });

  // 等待执行
  await Promise.all(jobs);
};

/**
 * 注册启动器
 * @param app
 */
export const register = (option: Option = {}): Booter => async (app, next) => {
  const appLogger = await app.getBean<Logger>(Logger);

  // 合并配置
  const config = {
    port: 7001,
    enableDoc: true,
    debug: false,
    ...option,
  };

  // 注册服务
  const server = new Koa();
  server.use(cors());

  // 健康检查
  server.use((ctx, next) => {
    if (ctx.path !== "/ping") return next();
    ctx.body = { ok: true };
    ctx.status = 200;
  });

  // 挂载业务
  server.use(bodyParser);
  server.use(compressor);
  app.bind(Koa).toValue(server);
  app.register(Router);

  // 后续操作
  await next();

  // 加载路由
  const router: Router = await app.getBean(Router);
  const controllers = await app.getBeansByTag("controller");

  // 日志中间件
  const logger = async (ctx: Context, next: Next) => {
    const time = Date.now();
    await next();
    appLogger.debug("httpd.request", {
      requestMethod: ctx.request.method,
      requestUrl: ctx.request.url,
      requestHeader: ctx.request.header,
      requestBody: ctx.request.body,
      requestTime: (Date.now() - time) / 1000,
      responseStatus: ctx.response.status || 200,
      responseBody: ctx.response.body,
    });
  };

  // 文档启用
  if (config.enableDoc) {
    const url = "/docs/doc.json";
    server.use((ctx, next) => {
      if (ctx.path !== url) return next();
      ctx.body = router.getSwaggerDoc();
    });
    server.use(
      koaSwagger({
        routePrefix: "/docs/index.html",
        hideTopbar: true,
        swaggerOptions: { url },
      })
    );
  }

  // 注册路由
  await Promise.all(
    controllers.map((ctl) => bindRouter(app, config, router, ctl))
  );

  // 处理请求
  if (config.debug) server.use(logger);
  server.use((ctx) => router.handle(ctx));

  // 监听端口
  server.listen(config.port, () => {
    appLogger.info("plugin.httpd", { message: "监听端口", port: config.port });
  });
};
