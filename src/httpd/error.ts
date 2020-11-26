/**
 * HTTP异常类
 */
export class HttpError extends Error {
  /**
   * 异常状态码
   */
  public readonly status: number;

  /**
   * 构造函数
   * @param message
   * @param status
   */
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * 请求错误异常
 */
export class BadRequestError extends HttpError {
  constructor(message: string = "Bad Request") {
    super(message, 400);
  }
}

/**
 * 未授权错误异常
 */
export class UnauthorizedError extends HttpError {
  constructor(message: string = "Unauthorized") {
    super(message, 401);
  }
}

/**
 * 无权限异常
 */
export class ForbiddenError extends HttpError {
  constructor(message: string = "Forbidden") {
    super(message, 403);
  }
}

/**
 * 资源不存在异常
 */
export class NotFoundError extends HttpError {
  constructor(message: string = "Not Found") {
    super(message, 404);
  }
}

/**
 * 服务端错误
 */
export class InternalServerError extends HttpError {
  constructor(message: string = "Internal Server Error") {
    super(message, 500);
  }
}
