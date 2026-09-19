# tolerance-license-server

智能公差计算器授权服务器。

## v7.0 Authorization Server

稳定的 v6.1.7 计算器逻辑保持不变；v7.0 独立提供在线授权、设备绑定和管理后台。

### Routes

- `/` — 服务状态页
- `/admin` — 授权管理后台
- `/api/health` — 服务健康检查
- `/api/db-health` — Neon 数据库健康检查
- `POST /api/license/activate` — 授权码激活并绑定 installationId
- `POST /api/license/verify` — 校验短期授权 token 与当前授权/设备状态
- `POST /api/admin/login` / `logout` — 管理员会话
- `GET/POST /api/admin/licenses` — 查看/创建授权
- `PATCH/DELETE /api/admin/licenses/[id]` — 管理/永久删除授权

### Client authorization flow

客户端首次运行生成并持久化随机 `installationId`。用户输入授权码后调用 `/api/license/activate`；成功后保存短期 token。正常启动和受保护操作调用 `/api/license/verify`，服务器会再次检查授权状态、到期时间、设备绑定并刷新短期 token。

客户端 API 支持无 Cookie 的跨域请求，便于下一阶段 v7.1 从本地 HTML 调用。管理员 API 仍使用 HttpOnly 管理员 Cookie。

### Security

授权码验证使用 HMAC-SHA256；可查看的完整授权码使用 AES-256-GCM 加密保存。installationId 在数据库中仅保存 HMAC。客户端 token 使用 SESSION_SECRET 签名并设置短有效期。

Vercel 环境变量必须包含 `DATABASE_URL`、`ADMIN_PASSWORD`、`SESSION_SECRET`、`LICENSE_PEPPER`。不要提交任何真实密钥、数据库密码、Token 或 `.env` 文件。

### Next

v7.1 将把 v6.1.7 计算器接入 activate/verify，并把高价值的完整执行脚本生成能力迁移到服务器端。
