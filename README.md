# number-dictionary-worker

一个基于 Cloudflare Workers 的数字字典服务，同时提供可直接打开的静态页面。

## 功能

- `GET /` — 数字字典网页（单文件静态页面）
- `GET|POST /api/decode` — 数字解码接口
  - `GET /api/decode?input=123456`
  - `POST /api/decode`，body：`{ "input": "6901234567892" }`
- `GET /api` 或 `GET /health` — 健康检查

线上地址：https://number-dictionary-worker.houfufa79.workers.dev

## 开发环境

- Node.js >= 18（推荐 20+）
- npm

## 本地运行

```bash
npm install       # 安装依赖（wrangler v4）
npm run dev       # 构建并启动本地开发服务器 http://localhost:8787
```

## 构建

`npm run build` 会执行 `scripts/build.mjs`，从 `src/template.html` +
`src/raw-dictionary.js` + `src/decode.js` 生成：

- `index.html` — 可直接在浏览器打开的独立页面
- `src/page.js` — 供 Worker 使用的 HTML 字符串模块

这两个产物是生成文件，请勿手动编辑。

## 部署

```bash
npm run deploy    # 构建并通过 wrangler 部署到 Cloudflare Workers
```

部署配置见 `wrangler.toml`。Worker 名称必须与 Cloudflare Workers Builds
中配置的名称（`number-dictionary-worker`）保持一致，否则 CI 会覆盖配置并尝试提交 PR。

## 数据提取

`51dic.csv`（4 列：数字,意义,例句数字,例句意义，CC-BY）是词典的唯一数据源。
`scripts/extract.mjs` 解析 CSV，按两位（00-99）/三位（000-999）token 逐字提取后
生成 `src/raw-dictionary.js`（`TWO_DIGIT` / `THREE_DIGIT`）：

```bash
npm install
node scripts/extract.mjs              # 从 51dic.csv 重新生成字典
```

仓库中的 `51dic-ccby.xml`、`51dic.mhtml` 等文件仅为历史来源存档，不再参与构建。

## License

MIT — 见 [LICENSE.md](LICENSE.md)。
