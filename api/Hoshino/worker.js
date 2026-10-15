/**
 * Cloudflare Worker —— 上游加固接口的跨域代理
 * 适用场景：前端部署在 GitHub Pages 等纯静态托管上（无法做反向代理）
 *
 * 作用：
 *   1) 接收你自己 Worker 域名下的 /api/ 请求
 *   2) 原样转发到上游 https://ark.yunzhuru.cn/api/
 *   3) 回包时补上 CORS 响应头，让浏览器不再拦截
 *
 * 部署（网页版，免安装）：
 *   1. 登录 https://dash.cloudflare.com  →  Workers & Pages  →  Create  →  Worker
 *   2. 起个名字（如 xingye-ark-api），把本文件全部内容粘贴进编辑器，Deploy
 *   3. 复制分配到的地址，形如 https://xingye-ark-api.你的账号.workers.dev
 *   4. 打开你站点里的 index.html，把开头改成：
 *        window.ARK_API_BASE = "https://xingye-ark-api.你的账号.workers.dev/api/";
 *      重新发布，加固功能即可正常使用
 *
 * 注意：Cloudflare Workers 单次请求体上限 100MB（免费版），超过请改用 VPS 方案。
 */

const UPSTREAM = "https://ark.yunzhuru.cn";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // 1) CORS 预检请求
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    // 2) 只代理 /api/ 路径，避免被当成开放代理
    if (!url.pathname.startsWith("/api/")) {
      return new Response(
        JSON.stringify({ code: 1001, msg: "仅代理 /api/ 路径", data: null }),
        { status: 404, headers: Object.assign({ "Content-Type": "application/json; charset=utf-8" }, CORS) }
      );
    }

    // 3) 转发到上游（multipart 的 Content-Type/boundary 必须原样保留）
    const target = UPSTREAM + url.pathname + url.search;
    const headers = new Headers();
    const ct = request.headers.get("Content-Type");
    if (ct) headers.set("Content-Type", ct);

    const isBodyless = request.method === "GET" || request.method === "HEAD";
    const init = {
      method: request.method,
      headers,
      redirect: "follow",
    };
    if (!isBodyless) {
      init.body = request.body;
      init.duplex = "half"; // 流式请求体所需（Cloudflare 与 Node 均支持）
    }
    const upstreamResp = await fetch(target, init);

    // 4) 回包并补上 CORS 头
    const resp = new Response(upstreamResp.body, upstreamResp);
    for (const [k, v] of Object.entries(CORS)) resp.headers.set(k, v);
    return resp;
  },
};
