import moment from "moment";

export interface Options {
  type: "JSON" | "DEBUG";
  level?: string;
}

/**
 * 日志服务
 */
export class Logger {
  protected type: "JSON" | "DEBUG";
  protected level: number;

  /**
   * 构造方法
   * @param options
   */
  constructor(options: Options) {
    this.type = options.type;
    switch (options.level) {
      case "DEBUG": {
        this.level = 0;
        break;
      }
      case "INFO": {
        this.level = 1;
        break;
      }
      case "WARN": {
        this.level = 2;
        break;
      }
      case "ERROR": {
        this.level = 3;
        break;
      }
      case "FATAL": {
        this.level = 4;
        break;
      }
      default: {
        this.level = 1;
      }
    }
  }

  /**
   * 打印内容
   * @param level
   * @param modular
   * @param content
   */
  protected printf(level: string, modular: string, content: Object) {
    if (this.type === "DEBUG") {
      const now = moment().format("YYYY-MM-DD HH:mm:ss");
      console.log(`[${level}]`, now, modular, content);
    } else if (this.type === "JSON") {
      console.log(
        JSON.stringify({
          level,
          modular,
          ...content,
        })
      );
    }
  }

  /**
   * 调试日志
   * @param modular
   * @param content
   */
  public debug(modular: string, content: Object) {
    if (this.level > 0) return;
    this.printf("DEBUG", modular, content);
  }

  /**
   * 信息日志
   * @param modular
   * @param content
   */
  public info(modular: string, content: Object) {
    if (this.level > 1) return;
    this.printf("INFO", modular, content);
  }

  /**
   * 警告日志
   * @param modular
   * @param content
   */
  public warn(modular: string, content: Object) {
    if (this.level > 2) return;
    this.printf("WARN", modular, content);
  }

  /**
   * 错误日志
   * @param modular
   * @param content
   */
  public error(modular: string, content: Object) {
    if (this.level > 3) return;
    this.printf("ERROR", modular, content);
  }

  /**
   * 失败日志
   * @param modular
   * @param content
   */
  public fatal(modular: string, content: Object) {
    this.printf("FATAL", modular, content);
  }
}
