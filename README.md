# Civil Service Exam Tracker

本文档简要说明项目使用的技术栈与快速运行方式。

## 技术栈

- 框架：Next.js (App Router, v14.x)
- 运行时：Node.js（部分 API 路由使用 `runtime = 'nodejs'`）
- 前端：React 18 + TypeScript
- 样式：Tailwind CSS + PostCSS + Autoprefixer
- 数据库：SQLite，通过 `better-sqlite3` 访问（本地嵌入式 DB）
- 文件存储：项目根 `uploads/`（运行时可写），通过 App Router API 路由 `/api/uploads/...` 提供访问
- 实时：浏览器 SSE (`/api/records/stream`) + 进程内 `EventEmitter`，可选集中式 pub/sub（Redis，使用 `ioredis`）用于多实例部署
- 其它依赖：`adm-zip`（导出 ZIP），`lucide-react`（图标），`zod`（可选校验）

## 快速开始（开发）

安装依赖并运行开发服务器：

```bash
npm install
npm run dev
```

在生产模式下构建并启动：

```bash
npm install --production
npm run build
npm start
```

## 运行时与环境变量

- `REDIS_URL`（可选）：如果部署为多实例（多台/多容器），设置此变量以启用 Redis pub/sub，使 SSE 事件跨实例广播。若未设置，系统退回为单实例的进程内事件总线。

## 上传文件与访问

- 所有运行时产生的可变文件（例如用户上传的图片）写入到项目根 `uploads/`。不要将这些写入 `public/`，因为 Next.js 的静态 public 索引通常在启动时生效，新增文件不会被即时服务。应用通过 `/api/uploads/<...>` 路径实时返回文件。
- 前端已做兼容：旧的 `/uploads/...` 路径会自动映射到 `/api/uploads/...`（见 `src/lib/url.ts`）。

## 实时更新（仪表盘）

- 仪表盘 `StatsPanel` 订阅 `/api/records/stream`（SSE），在记录创建/更新/删除时会自动刷新统计。
- 在多实例场景下，请设置 `REDIS_URL`，或者在没有 Redis 的情况下使用外部消息代理替代方案。

## 导出与迁移

- 导出接口：`/api/export?format=json|csv|zip`，zip 包会打包 `uploads/` 中引用到的图片。
- 我们在仓库内保留了迁移脚本（若存在），用于将 `public/uploads` 中旧文件迁移到项目根 `uploads/` 并更新数据库引用。请在运行迁移前备份数据库。

## 验证（简单测试）

1. 打开两个浏览器窗口访问应用仪表盘。  
2. 在窗口 A 中新增一条试题记录。  
3. 窗口 B 的“科目 - 题型 - 知识点”区域应在几秒内自动刷新显示新增数据（若为多实例，请先配置 `REDIS_URL`）。

