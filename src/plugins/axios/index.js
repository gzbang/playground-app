import axios from "axios";
import handleResponse from "./handleResponse";
import handleError from "./handleError";
import setConfig from "./setConfig";

const showTip = (tip) => {
  // Message({
  //     type: 'warning',
  //     message: tip || '请求出错啦',
  //     duration: 1500
  // })
  console.log(tip);
};

export let intactRequest = setConfig(axios);
export let request = setConfig(intactRequest.create());

// 请求中的api
let pendingPool = new Map();

/**
 * 请求拦截
 */
const requestInterceptorId = request.interceptors.request.use(
  (config) => {
    // 对于异常的响应也需要在pendingPool中将其删除，但响应拦截器中的异常响应有些获取不到请求信息，这里将其保存在实例上
    request.config = Object.assign({}, config);
    // 在发送请求之前做些什么
    // config.headers.common['cookie-id'] = cookieId
    config.cancelToken = new axios.CancelToken((cancelFn) => {
      pendingPool.has(config.url)
        ? cancelFn(`${config.url}请求重复`)
        : pendingPool.set(config.url, { cancelFn, global: config.global });
    });

    return config;
  },
  (err) => {
    console.log("请求拦截err:", err);
    // 对请求错误做些什么
    Promise.reject(err);
  }
);
/**
 * 响应拦截
 */
const responseInterceptorId = request.interceptors.response.use(
  (response) => {
    const { config } = response;
    pendingPool.delete(config.url);

    return Promise.resolve(handleResponse(response));
  },
  // 对异常响应处理
  (err) => {
    const { config } = request;
    if (!axios.isCancel(err)) pendingPool.delete(config.url);

    if (!err) return Promise.reject(err);

    if (err.response) {
      err = handleError(err);
    }
    // 没有response(没有状态码)的情况
    // eg: 超时；断网；请求重复被取消；主动取消请求；
    else {
      // 错误信息err传入isCancel方法，可以判断请求是否被取消
      if (axios.isCancel(err)) {
        throw new axios.Cancel(
          err.message || `请求'${request.config.url}'被取消`
        );
      } else if (err.stack && err.stack.includes("timeout")) {
        err.message = "请求超时!";
      } else {
        err.message = "连接服务器失败!";
      }
    }
    showTip(err.message);
    return Promise.reject(err);
  }
);
// 移除全局的请求拦截器
function removeRequestInterceptor() {
  request.interceptors.request.eject(requestInterceptorId);
}

// 移除全局的响应拦截器
function removeResponseInterceptor() {
  request.interceptors.response.eject(responseInterceptorId);
}

/**
 * 清除所有pending状态的请求
 * @param {Array} whiteList 白名单，里面的请求不会被取消
 * 返回值 被取消了的api请求
 * 可以在路由变化时取消当前所有非全局的pending状态的请求
 */
function clearPendingPool(whiteList = []) {
  if (!pendingPool.size) return;

  const pendingUrlList = Array.from(pendingPool.keys()).filter(
    (url) => !whiteList.includes(url)
  );
  if (!pendingUrlList.length) return;

  pendingUrlList.forEach((pendingUrl) => {
    // 清除掉所有非全局的pending状态下的请求
    if (!pendingPool.get(pendingUrl).global) {
      pendingPool.get(pendingUrl).cancelFn();
      pendingPool.delete(pendingUrl);
    }
  });

  return pendingUrlList;
}

request.removeRequestInterceptor = removeRequestInterceptor;
request.removeResponseInterceptor = removeResponseInterceptor;
request.clearPendingPool = clearPendingPool;