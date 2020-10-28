export { Context, Next } from "koa";
export { HTTPMethod } from "trouter";
import { register } from "./register";
export * from "./annotation";
export * from "./router";
export * from "./register";
export default register;
