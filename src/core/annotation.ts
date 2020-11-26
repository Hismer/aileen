import callsite from "callsite";
/**
 * 注解反射参数
 */
export interface AnnotationRef<T = any> {
  type: "Class" | "Property" | "Method" | "Parameter";
  target: Function | Object;
  propertyKey?: string | symbol;
  descriptor?: TypedPropertyDescriptor<any>;
  parameterIndex?: number;
}

/**
 * 注解数据设置器
 */
export type AnnotationSetter<T> = (data: T, refs: AnnotationRef) => any;
export type Decorator =
  | ClassDecorator
  | PropertyDecorator
  | MethodDecorator
  | ParameterDecorator;

/**
 * 注解基础类
 */
export class Annotation<T> {
  /**
   * 唯一标识
   */
  public readonly id: symbol;

  /**
   * 原型生成器
   */
  protected protoBuild: () => T;

  /**
   * 注解已注册
   */
  public readonly registered: AnnotationRef[] = [];

  /**
   * 创建注解
   * @param proto
   */
  constructor(build: () => T) {
    const name = callsite()[1].getFileName();
    this.id = Symbol.for(name);
    this.protoBuild = build;
  }

  /**
   * 获取反射元数据
   * @param target
   */
  public getRef(target: Function | Object): T {
    if (target instanceof Function) {
      return Reflect.getMetadata(this.id, target.prototype);
    } else {
      return Reflect.getMetadata(this.id, target);
    }
  }

  /**
   * 标记注解对象
   * @param target
   * @param init
   */
  public tag(ref: AnnotationRef, init: AnnotationSetter<T> = () => {}) {
    // 注册注解对象
    this.registered.push(ref);

    // 添加已有标记
    let meta = this.getRef(ref.target);
    if (meta) return init(meta, ref);

    // 标记目标处理
    let target = ref.target;
    if (target instanceof Function) {
      target = target.prototype;
    }

    // 新对象标记
    meta = this.protoBuild();
    Reflect.defineMetadata(this.id, meta, target);
    return init(meta, ref);
  }

  /**
   * 导出类注解
   */
  public exportDecorator<D extends Decorator>(
    init: AnnotationSetter<T>,
    extend: D | D[] = []
  ): D {
    return <any>((
      target: Function | Object,
      propertyKey?: string | symbol,
      info?: TypedPropertyDescriptor<any> | number
    ) => {
      // 参数归一处理
      if (!(extend instanceof Array)) {
        extend = [extend];
      }

      // 父注解调用
      for (const ext of extend) {
        (<any>ext)(target, propertyKey, info);
      }

      // 类注解
      if (propertyKey === undefined) {
        this.tag({ type: "Class", target }, init);
        return;
      }

      // 属性注解
      if (info === undefined) {
        this.tag({ type: "Property", target, propertyKey }, init);
        return;
      }

      // 参数注解
      if (typeof info === "number") {
        this.tag(
          {
            type: "Parameter",
            target,
            propertyKey,
            parameterIndex: info,
          },
          init
        );
      }
      // 方法注解
      else {
        this.tag(
          {
            type: "Method",
            target,
            propertyKey,
            descriptor: info,
          },
          init
        );
      }
    });
  }
}
