import { Container } from "../container";
import compose from "koa-compose";
import { Next } from "koa";

/**
 * 启动器
 */
export type Booter = (app: Application, next: Next) => any;

/**
 * 应用对象
 */
export class Application extends Container {
  /**
   * 应用启动
   */
  protected boots: Booter[] = [];

  /**
   * 构造函数
   */
  constructor() {
    super();
    this.bind(Application).toValue(this);
  }

  /**
   * 引用插件
   * @param booter
   */
  public use(booter: Booter) {
    this.boots.push(booter);
  }

  /**
   * 启动项目
   */
  public start(): Promise<any> {
    return compose(this.boots)(this);
  }
}
