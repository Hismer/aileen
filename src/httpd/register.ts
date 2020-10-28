import Koa from "koa";
import cors from "koa2-cors";
import body from "koa-body";
import compress from "koa-compress";
import { koaSwagger } from "koa2-swagger-ui";
import { Router } from "./router";
import { Booter } from "../core";
import { Context, Next } from "koa";
import { ControllerReflect, HttpReflect } from "./annotation";

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
  doc?: string;
  swagger?: any;
}

/**
 * 注册启动器
 * @param app
 */
export const register = (option: Option = {}): Booter => async (app, next) => {
  // 合并配置
  const config = {
    port: 7001,
    doc: "/docs",
    ...option,
  };

  // 注册服务
  const server = new Koa();
  server.use(cors());
  server.use(bodyParser);
  server.use(compressor);
  app.bind(Koa).toValue(server);

  // 注册路由
  app.register(Router);

  // 后续操作
  await next();

  // 日志中间件
  const logger = async (ctx: Context, next: Next) => {
    const time = Date.now();
    await next();
    console.log(`[DEBUG HTTP START] `);
    console.log("request url:", ctx.request.method, ctx.request.url);
    console.log("request headers:", ctx.request.header);
    console.log("request body:", ctx.request.body);
    console.log("resopnse status:", ctx.status);
    console.log("response body:", ctx.body);
    console.log("response time:", (Date.now() - time) / 1000);
    console.log(`[DEBUG HTTP END] `);
  };

  // 文档启用
  if (config.swagger) {
    const url = config.doc + "/doc.json";
    server.use((ctx, next) => {
      if (ctx.path !== url) return next();
      ctx.body = config.swagger;
    });
    server.use(
      koaSwagger({
        routePrefix: config.doc + "/index.html",
        hideTopbar: true,
        swaggerOptions: { url },
      })
    );
  }

  // 获取路由
  const router: Router = await app.getBean(Router);

  // 获取所有控制器
  const controllers = await app.getBeansByTag("controller");

  // 注册路由
  for (const ctl of controllers) {
    const ctlRef = ControllerReflect.getMetadata(ctl);
    if (!ctlRef) continue;

    const basePath = ctlRef.metas[0].path;
    if (ctl.init instanceof Function) await ctl.init();

    const httpRef = HttpReflect.getMetadata(ctl);
    if (!httpRef) continue;

    httpRef.method.forEach((meta, key) => {
      const { method, path } = meta.metas[0];
      const action = ctl[key].bind(ctl);
      router.register(method, basePath + path, action);
    });
  }

  // 处理请求
  server.use(logger);
  server.use((ctx) => router.handle(ctx));

  // 监听端口
  server.listen(config.port, () => {
    console.log("[httpd]", `监听端口 : ${config.port}`);
  });
};
