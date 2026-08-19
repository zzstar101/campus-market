# Campus Market

校园二手交易与智能估价平台。项目覆盖“上传图片 -> AI 识别/估价/生成文案 -> 编辑确认 -> 写入 SQLite -> 首页检索 -> 状态流转”的完整闭环，并提供 JWT 登录、个人发布中心和管理员内容管控页面。

## 技术栈

- Web：React 19、Vite、TypeScript、Tailwind CSS、TanStack Query
- API：Bun、Hono、Drizzle ORM
- 数据库：SQLite
- AI：OpenAI 多模态 Responses API，结构化输出由 Zod 校验

## 环境配置

需要安装 Bun 1.3 或更高版本，然后安装依赖：

```bash
bun install
```

复制 `apps/api/.env.example` 为 `apps/api/.env`，填写：

```env
OPENAI_API_KEY=你的服务端密钥
BASE_URL=
AI_MODEL=gpt-4o-mini
JWT_SECRET=请替换成随机长字符串
ADMIN_USERNAME=
```

`OPENAI_API_KEY` 只在 API 服务端读取，不会进入前端代码。`ADMIN_USERNAME` 可选：设置后，用该用户名注册的账号会获得管理员角色；已有账号重新登录时也会按该配置识别。

数据库文件默认位于 `apps/api/data/app.db`，图片位于 `apps/api/data/uploads/`。服务启动时会自动创建目录，并兼容补齐旧数据库的 `users.role`、`products.user_id` 等字段。

## 启动

终端一：

```bash
cd apps/api
bun run dev
```

API 默认地址为 `http://localhost:3000`，健康检查：`GET /api/health`。

终端二：

```bash
cd apps/web
bun run dev
```

前端默认地址为 `http://localhost:5173`。Vite 会把 `/api` 和 `/uploads` 代理到 API 服务。

## 主要页面

- `/`：商品流、关键词模糊搜索、分类筛选和分页
- `/register`、`/login`：注册与登录
- `/publish`：1-3 张图片上传、AI 分析、信息微调和发布
- `/products/:id`：商品详情、发布时间、AI 标签、复制联系方式和状态管理
- `/me`：查看和管理自己的全部发布
- `/admin`：管理员查看和删除违规商品

## 校验命令

```bash
cd apps/web
bun run lint
bun run build

cd ../api
bun run typecheck
```

完整演示建议按以下顺序操作：注册账号，进入“AI 智能发布”上传图片并填写联系方式，确认发布后回到首页搜索/筛选商品，进入详情页复制联系方式，再在商品管理中标记“已售出”或“下架”。
