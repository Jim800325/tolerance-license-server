# tolerance-license-server

智能公差计算器授权服务器。

## v7.0 Phase 1

当前阶段只建立独立 Next.js 授权服务骨架，不修改稳定的 v6.1.7 计算逻辑。

### Routes

- `/` — 服务状态页
- `/admin` — 授权管理后台占位页
- `/api/health` — 健康检查 API
- `/api/db-health` — Phase 2 Neon 数据库连接健康检查

### Local development

```bash
npm install
npm run dev
```

### Deployment

连接本仓库到 Vercel，Framework Preset 使用 Next.js。数据库凭据只通过 Vercel Environment Variables 提供，禁止提交到 Git。

### Phase 2

Neon Postgres 接入正在实施。授权数据库结构、服务端授权码哈希与数据库健康检查代码均保留在独立 v7.0 授权服务器中，不修改稳定的 v6.1.7 计算逻辑。

> 不要把 `.env`、Vercel Token、数据库密码、`DATABASE_URL`、`LICENSE_PEPPER` 或其他密钥提交到 Git。
