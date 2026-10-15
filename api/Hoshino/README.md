# 星野 Ark 加固 · 站点部署包

Android APK 在线加固站点，含完整前端（三语言）。品牌为「星野 Ark 加固」，
接口协议完全沿用原站公开定义。

---

## ⚠️ 先读这段：部署平台决定加固功能能不能用

本站是「**静态前端 + 必须反向代理**」的架构。原因：前端请求的是**同域相对路径** `/api/`，
而加固接口在上游 `https://ark.yunzhuru.cn/api/`。

关键限制（已实测）：

- 上游 `OPTIONS` 预检返回 **405**，`POST` 响应**不带** `Access-Control-Allow-Origin`
  → 浏览器**直连上游一定会被 CORS 拦截**，必须经中间层转发。

因此：

| 部署平台 | 能看页面 | 能加固 | 原因 |
|---|---|---|---|
| GitHub Pages | ✅ | ❌ | 纯静态托管，不支持反向代理、不执行 PHP |
| **Netlify / Vercel / Cloudflare Pages** | ✅ | ✅ | 支持配置反向代理 |
| VPS（本包 server.js / nginx） | ✅ | ✅ | 可自由反代 |
| 宝塔面板 + 反代规则 | ✅ | ✅ | 可配置反代 |

> 在 GitHub Pages 上点「开始安全加固」会报 `Unexpected token '<' ... is not valid JSON`，
> 因为 `/api/` 请求命中了 GitHub 的 404 HTML 页面。

---

## 一、目录结构

```
.
├── index.html         前端单页（CSS/JS 全内联）
├── images/            SHA256-1.png、SHA256-2.png
├── language/          index.php + 简体/繁體/English
├── server.js          Node：静态托管 + /api/ 反代（零依赖）
├── nginx.conf         Nginx 反代配置（VPS 用）
├── _redirects         Netlify / Cloudflare Pages 反代规则
├── vercel.json        Vercel 反代规则
├── worker.js          Cloudflare Worker 跨域代理（GitHub Pages 用）
├── package.json
└── README.md
```

---

## 二、四种部署方案（按你的情况选一个）

### 方案 1️⃣ Netlify（最省事，推荐）

1. 打开 https://app.netlify.com/drop
2. 把**整个文件夹**（或本 zip 解压后的目录）拖进去
3. 完成 → 自动分配域名 + HTTPS
4. 包里的 `_redirects` 会自动把 `/api/*` 代理到上游

**前端无需任何改动。**

### 方案 2️⃣ Vercel

1. 把本目录推到 GitHub 仓库
2. https://vercel.com → New Project → 导入该仓库 → Deploy
3. 包里的 `vercel.json` 自动生效

**前端无需任何改动。**

### 方案 3️⃣ Cloudflare Pages

1. https://dash.cloudflare.com → Workers & Pages → Create → Pages → 连接你的 GitHub 仓库
2. 构建输出目录填 `.`（根目录）→ 部署
3. 包里的 `_redirects` 自动生效

**前端无需任何改动。**

### 方案 4️⃣ 继续用 GitHub Pages + Cloudflare Worker 代理

保留现有 GitHub Pages，另起一个免费 Worker 做跨域代理：

1. 登录 https://dash.cloudflare.com → Workers & Pages → Create → Worker
2. 命名（如 `xingye-ark-api`），把 `worker.js` **全部内容**粘贴进去 → Deploy
3. 复制分配到的地址，形如 `https://xingye-ark-api.xxx.workers.dev`
4. 打开 `index.html`，改开头这一行：

   ```html
   <script>
     window.ARK_API_BASE = "https://xingye-ark-api.xxx.workers.dev/api/";
   </script>
   ```

5. 重新发布到 GitHub Pages

> Worker 代理已本地实测：转发成功、预检返回 204、自动补 CORS 头。
> 限制：单次请求体上限 **100MB**（免费版），超大 APK 请改用方案 1/2/3 或 VPS。

### 方案 5️⃣ 自有服务器（VPS）

```bash
node server.js            # → http://127.0.0.1:8080
# 或
sudo cp nginx.conf /etc/nginx/conf.d/xingye-ark.conf   # 改域名/证书/root 后 reload
```

---

## 三、API 地址配置说明

`index.html` 顶部有一段集中配置：

```html
<script>
  window.ARK_API_BASE = "";     // 留空 = 同域名 /api/（方案 1/2/3/5 用）
</script>
```

- **留空** → 前端请求 `当前域名/api/`，由平台反代转发（方案 1/2/3/5）
- **填绝对地址** → 前端直接请求该地址（方案 4，配合 Worker）

---

## 四、接口协议（原站公开，前端已内置）

统一信封：`{"version":"v1","module":"jiagu","method":"<名>","data":{...}}`
响应：`{"code":0,"msg":"ok","data":{...}}`，`code===0` 为成功。

| method | 请求体 | 说明 |
|---|---|---|
| `precheck` | JSON | 上传预检，返回能否秒传、剩余额度 |
| `upload` | multipart（字段平铺） | 提交 APK 与加固参数 |
| `query` | JSON | 按 `md5` / `md5_list` 查询任务状态 |

---

## 五、部署前请核对

| 项目 | 当前值 | 说明 |
|---|---|---|
| 品牌 | 星野 Ark 加固 / Xingye Ark Protection | 已替换 |
| 页脚公司 | 本服务由星野 Ark 提供 | 已移除原站公司名 |
| 备案号 | 占位 `京ICP备00000000号` | ⚠️ 换成你自己的，见 `index.html` 的 `<div class="filing">` |

---

## 六、注意事项

- 每 IP 每自然日最多创建 **10** 条加固任务（普通 + 秒传均计数），超限 `code:1011`。
- 加固结果不支持华为鸿蒙 6 及以上系统。
- 上游加固服务归其运营方所有，对外运营前请确认已获授权；勿上传无合法处理权限的应用。

---

_更新：2026-10-15_
