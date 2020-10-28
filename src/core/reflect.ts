/**
 * 注解信息
 */
export interface Annotation<T = any> {
  target: Function | Object;
  propertyKey?: string | symbol;
  descriptor?: TypedPropertyDescriptor<T>;
  parameterIndex?: number;
}

/**
 * 基础注解对象
 */
class BaseMetaData<T> {
  /**
   * 注解信息
   */
  public readonly metas: T[] = [];

  /**
   * 增加注解信息
   * @param value
   */
  public setMeta(value: T) {
    this.metas.push(value);
  }
}

/**
 * 参数注解
 */
export class ParameterMetaData<T> extends BaseMetaData<T> {}

/**
 * 属性注解
 */
export class PropertyMetaData<T> extends BaseMetaData<T> {}

/**
 * 方法注解
 */
export class MethodMetaData<T> extends PropertyMetaData<T> {
  /**
   * 方法描述
   */
  public descriptor: TypedPropertyDescriptor<any> = {};

  /**
   * 参数注解
   */
  public readonly parameter: ParameterMetaData<T>[] = [];

  /**
   * 构造方法
   * @param descriptor
   */
  constructor(descriptor?: TypedPropertyDescriptor<any>) {
    super();
    this.descriptor = descriptor;
  }

  /**
   * 设置方法
   * @param descriptor
   */
  setDescriptor(descriptor?: TypedPropertyDescriptor<any>) {
    Object.assign(this.descriptor, descriptor);
    this.descriptor = descriptor;
  }

  /**
   * 定义参数
   */
  defineParameter(index: number) {
    if (this.parameter[index]) return;
    const newParameter = new ParameterMetaData<T>();
    this.parameter[index] = newParameter;
  }

  /**
   * 获取参数注解
   * @param index
   */
  getParameter(index: number) {
    return this.parameter[index];
  }
}

/**
 * 反射元数据对象
 */
export class ClassMetaData<T> extends BaseMetaData<T> {
  /**
   * 反射目标类
   */
  public readonly target: Function | Object;

  /**
   * 类属性元对象
   */
  public readonly property: Map<
    string | symbol,
    PropertyMetaData<T>
  > = new Map();

  /**
   * 类方法元对象
   */
  public readonly method: Map<string | symbol, MethodMetaData<T>> = new Map();

  /**
   * 构造方法
   * @param target
   */
  constructor(target: Function | Object) {
    super();
    this.target = target;
  }

  /**
   * 获取属性元对象
   * @param key
   */
  getProperty(key: string | symbol): PropertyMetaData<T> {
    return this.property.get(key);
  }

  /**
   * 定义属性
   */
  defineProperty(key: string | symbol) {
    if (this.property.has(key)) return;
    const newProperty = new PropertyMetaData<T>();
    this.property.set(key, newProperty);
  }

  /**
   * 获取属性元对象
   * @param key
   */
  getMethod(key: string | symbol): MethodMetaData<T> {
    return this.method.get(key);
  }

  /**
   * 定义方法
   */
  defineMethod(key: string | symbol, descriptor: TypedPropertyDescriptor<any>) {
    if (this.method.has(key)) return;
    const newMethod = new MethodMetaData<T>(descriptor);
    this.method.set(key, newMethod);
  }
}

/**
 * 注解类
 */
export class AnnotationReflect<T> {
  /**
   * 唯一标识
   */
  public readonly id = Symbol();

  /**
   * 获取标注
   * @param value
   */
  public defineMetadata(value: T & Annotation) {
    // 请求参数拆解
    const {
      target,
      propertyKey,
      descriptor,
      parameterIndex,
      ...options
    } = value;

    // 获取反射元对象
    let metadata: ClassMetaData<T> = this.getMetadata(target);
    if (!metadata) {
      metadata = new ClassMetaData(target);
      if (target instanceof Function) {
        Reflect.defineMetadata(this.id, metadata, target.prototype);
      } else {
        Reflect.defineMetadata(this.id, metadata, target);
      }
    }

    // 类注解
    if (propertyKey === undefined) {
      metadata.setMeta(<any>options);
      return;
    }

    // 方法注解
    if (descriptor !== undefined) {
      metadata.defineMethod(propertyKey, descriptor);
      const methodMetadata = metadata.getMethod(propertyKey);
      methodMetadata.setMeta(<any>options);
      return;
    }

    // 参数注解
    if (parameterIndex !== undefined) {
      metadata.defineMethod(propertyKey, descriptor || {});
      const methodMetadata = metadata.getMethod(propertyKey);
      methodMetadata.defineParameter(parameterIndex);
      const parameterMetadata = methodMetadata.getParameter(parameterIndex);
      parameterMetadata.setMeta(<any>options);
      return;
    }

    // 属性注解
    metadata.defineProperty(propertyKey);
    const propertyMetadata = metadata.getProperty(propertyKey);
    propertyMetadata.setMeta(<any>options);
  }

  /**
   * 获取类标注
   * @param value
   */
  public getMetadata(target: Function | Object): ClassMetaData<T> {
    if (target instanceof Function) {
      return Reflect.getMetadata(this.id, target.prototype);
    } else {
      return Reflect.getMetadata(this.id, target);
    }
  }
}
