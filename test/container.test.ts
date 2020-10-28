import assert from "power-assert";
import { Container, Autowride } from "../src";

describe("[框架] 依赖注入容器测试", () => {
  it("测试定值对象读写", async () => {
    const container = new Container();

    // 普通字符串操作
    container.bind("test1").toValue("hello");
    let res = await container.getBean("test1");
    assert(res === "hello");

    // 对象操作
    const obj = { hello: 123 };
    container.bind("test2").toValue(obj);
    obj.hello = 456;
    res = await container.getBean("test2");
    assert(res === obj);
    res = await container.getBean("test2");
    assert(res === obj);

    // 布尔类型测试
    container.bind("test3").toValue(true);
    res = await container.getBean("test3");
    assert(res === true);

    // 空值类型测试
    container.bind("test4").toValue(null);
    res = await container.getBean("test4");
    assert(res === null);
  });

  it("测试构造类绑定", async () => {
    const container = new Container();

    // 创建测试对象
    const Test = class {
      hello() {
        return "hello";
      }
    };

    // 普通字符串操作
    container.bind("test1").to(Test);
    let res: any = await container.getBean("test1");
    assert(res instanceof Test);
    assert(res.hello() === "hello");

    // 类型自动绑定
    container.bind(Test).toSelf();
    res = await container.getBean(Test);
    assert(res instanceof Test);
    assert(res.hello() === "hello");
  });

  it("测试工厂方法绑定", async () => {
    const container = new Container();
    let res1: any, res2: any;

    // 单例模式测试
    container.bind("test1").toFactory(() => {
      return { hello: 123 };
    });
    res1 = await container.getBean("test1");
    assert(res1.hello === 123);
    res1.hello === 456;
    res2 = await container.getBean("test1");
    assert(res1 === res2);

    // 多例模式测试
    container
      .bind("test2")
      .isSingleton(false)
      .toFactory(() => {
        return { hello: 123 };
      });

    res1 = await container.getBean("test2");
    assert(res1.hello === 123);
    res1.hello === 456;
    res2 = await container.getBean("test2");
    assert(res1 !== res2);
  });

  it("测试依赖自动解析", async () => {
    const container = new Container();
    container.bind("test").toValue(123456);

    // 创建测试对象
    class Test {
      @Autowride("test")
      demo1: number;

      demo2: number;

      @Autowride("test")
      setDemo2(v: number) {
        this.demo2 = v;
      }

      _demo3: number;

      @Autowride("test")
      set demo3(v: number) {
        this._demo3 = v;
      }
    }

    // 获取依赖注入容器
    container.register(Test);
    const test = await container.getBean<Test>(Test);

    // 断言属性注入
    assert(test.demo1 === 123456);
    assert(test.demo2 === 123456);
    assert(test._demo3 === 123456);
  });
});
