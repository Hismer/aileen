/**
 * 可实力化类型
 */
export interface Newable<T> {
  new (...args: any[]): T;
}

/**
 * 抽象类类型
 */
export interface Abstract<T> {
  prototype: T;
}
