# 星野 Ark 加固 · 站点部署包

Android APK 在线加固站点，含完整前端（三语言）+ `/api/` 反向代理。
前端逻辑与接口协议**完全沿用原站公开定义**，品牌已替换为「星野 Ark 加固」。

---

## 一、目录结构

```
.
├── index.html             196KB  前端单页（HTML/CSS/JS 全内联，自包含）
├── images/
│   ├── SHA256-1.png        25KB  签名教程截图 ①
│   └── SHA256-2.png        76KB  签名教程截图 ②
├── language/
│   ├── index.php          209B   语言列表接口（静态 JSON）
│   ├── 简体中文.json      中文语言包
│   ├── 繁體中文.json      繁体语言包
│   └── English.json       英文语言包
├── server.js                      Node 服务：静态托管 + /api/ 反向代理（零依赖）
├── nginx.conf                     Nginx 部署方案
├── package.json
└── README.md
```

---

## 二、快速部署

### 方式 A：Node（本地/临时最快）

```bash
node server.js                 # → http://127.0.0.1:8080
PORT=3000 node server.js       # 指定端口
```

### 方式 B：Nginx（推荐生产）

```bash
sudo cp nginx.conf /etc/nginx/conf.d/xingye-ark.conf
# 修改 server_name / root / SSL 证书路径
sudo nginx -t && sudo systemctl reload nginx
```

### 方式 C：宝塔/静态托管 + 单独配反代

把 `index.html`、`images/`、`language/` 上传到网站根目录，
再在面板里加一条反向代理规则：`/api/` → `https://ark.yunzhuru.cn/api/`。

---

## 三、接口对接说明（重要）

前端接口地址为**相对路径** `/api/`（代码中 `var API = "/api/"`，
展示时用 `location.origin + "/api/"`），因此：

> **必须在你自己的服务器上把 `/api/` 反向代理到上游 `https://ark.yunzhuru.cn/api/`**，
> 否则请求打到你本地 404；若把前端改成直连上游域名，浏览器会因跨域（CORS）拦截。

```
浏览器 ──POST /api/──▶ 你的服务器 ──反代──▶ ark.yunzhuru.cn/api/ ──▶ 加固集群
        ◀──────────── JSON 原样回传 ───────────┘
```

上游接口（原站公开，前端已内置，无需改动）：

| method | 请求体 | 说明 |
|---|---|---|
| `precheck` | JSON | 上传预检，返回是否可秒传与剩余额度 |
| `upload` | multipart（字段平铺） | 提交 APK 与加固参数 |
| `query` | JSON | 按 md5 / md5_list 查询任务状态 |

统一信封：`{"version":"v1","module":"jiagu","method":"<名>","data":{...}}`
响应：`{"code":0,"msg":"ok","data":{...}}`，`code===0` 成功。

---

## 四、部署前请核对（已替你改好，仅需确认）

| 项目 | 当前值 | 说明 |
|---|---|---|
| 品牌名 | **星野 Ark 加固** / Xingye Ark Protection | 已替换原站品牌 |
| 页脚公司 | 本服务由星野 Ark 提供 | 已移除原站公司名 |
| 备案号 | 占位 `京ICP备00000000号` | ⚠️ **请换成你自己的真实备案号**，见 `index.html` 中 `<div class="filing">` |
| SEO | 已随品牌更新 | 语言包 `meta.title/description/keywords` |

> `localStorage` 键仍为 `arksafe.tasks.v1` / `arksafe.language.v1`（内部标识，可保留）。

---

## 五、注意事项

- **额度**：每 IP 每自然日最多创建 10 条加固任务（普通 + 秒传均计数），超限返回 `code:1011`。
- **超时**：加固耗时数分钟，反代读超时建议 ≥ 600s（配置里已设）。
- **上传**：`upload` 用 multipart，字段**平铺**，`file` 字段为 APK 本体。
- **兼容性**：加固结果不支持华为鸿蒙 6 及以上系统。
- **合规**：上游加固服务归其运营方所有，对外运营前请确认已获授权；
  请勿上传你无合法处理权限的应用。

---

_打包时间：2026-10-15_
