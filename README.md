# tolerance-license-server

智能公差计算器授权服务器。

## v7.0 Phase 1

当前阶段只建立独立 Next.js 授权服务骨架，不修改稳定的 v6.1.7 计算逻辑。

### Routes

- `/` — 服务状态页
- `/admin` — 授权管理后台占位页
- `/api/health` — 健康检查 API

### Local development

```bash
npm install
npm run dev
```

### Deployment

连接本仓库到 Vercel，Framework Preset 使用 Next.js。当前阶段不需要任何环境变量。

### Next phase

Phase 2 将连接 Neon Postgres，并加入授权创建、有效期、设备数量、暂停/撤销、设备重置和管理员登录。

> 不要把 `.env`、Vercel Token、数据库密码或 `DATABASE_URL` 提交到 Git。
