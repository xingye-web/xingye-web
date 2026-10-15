/**
 * 复刻站点服务端（零依赖，Node 18+ 内置模块）
 *
 * 作用：
 *   1) 静态托管 index.html / images / language
 *   2) 把本站 /api/ 反向代理到 星野 Ark 上游 https://ark.yunzhuru.cn/api/
 *      —— 前端固定用 location.origin + "/api/"，必须同域，否则浏览器跨域(CORS)会失败
 *   3) 把 /language/ 也一并处理（本地语言包已下载，直接静态返回）
 *
 * 启动:  node server.js           # 默认 http://127.0.0.1:8080
 *        PORT=3000 node server.js
 *
 * ⚠️ 生产环境请把 UPSTREAM 的加固服务按对方条款获得授权；本文件仅解决技术接入。
 */
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8080;
const UPSTREAM_HOST = process.env.UPSTREAM_HOST || "ark.yunzhuru.cn";
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".php": "application/json; charset=utf-8", // 本目录下的 index.php 实为静态 JSON 导出
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

/** 反向代理：将请求流式转发到上游，支持大文件 multipart 上传 */
function proxy(req, res) {
  const opts = {
    hostname: UPSTREAM_HOST,
    port: 443,
    method: req.method,
    path: req.url, // 保持 /api/ 原路径
    headers: Object.assign({}, req.headers, { host: UPSTREAM_HOST }),
  };
  const up = https.request(opts, (upRes) => {
    res.writeHead(upRes.statusCode, upRes.headers);
    upRes.pipe(res); // 流式回传，不缓冲
  });
  up.on("error", (err) => {
    res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ code: 1500, msg: "上游服务不可用: " + err.message, data: null }));
  });
  req.pipe(up); // 流式上传，不占内存
}

/** 静态文件服务 */
function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === "/" || rel === "") rel = "/index.html";
  const filePath = path.normalize(path.join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      return res.end("<h1>404 Not Found</h1>");
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": pathname === "/" ? "no-cache" : "public, max-age=86400",
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

http
  .createServer((req, res) => {
    const pathname = (req.url.split("?")[0] || "/");
    if (pathname.startsWith("/api/")) return proxy(req, res);
    serveStatic(req, res, pathname);
  })
  .listen(PORT, () => {
    console.log(`复刻站点已启动: http://127.0.0.1:${PORT}`);
    console.log(`  /api/  → https://${UPSTREAM_HOST}/api/  (反向代理)`);
  });
