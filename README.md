# tolerance-license-server

智能公差计算器 v7.2 在线授权加固版。

稳定的 v6.1.7 计算/解析逻辑保持不变；v7.2 在其外层提供在线授权、设备绑定、功能权限和服务端完整执行脚本生成。

## v7.2 Production

- `/` — 智能公差计算器 v7.2
- `/admin` — 授权管理后台
- `/api/health` / `/api/db-health` — 服务与 Neon 数据库健康检查
- `POST /api/license/activate` — 激活授权并绑定 installationId
- `POST /api/license/verify` — 校验 token、设备、授权状态和到期时间，并刷新 token
- `POST /api/generate-script` — 授权后由服务器生成完整执行脚本
- `GET/POST /api/admin/licenses` — 查看/创建授权
- `PATCH/DELETE /api/admin/licenses/[id]` — 修改状态、到期时间、设备上限、功能权限，重置设备或永久删除

## Authorization behavior

客户端首次运行生成并持久化随机 `installationId`。v7.2 继续保留既有客户端的安装标识存储键，避免升级后被误识别为新设备。授权 token 为可续期 7 天 token，但每次受保护操作仍通过 `/api/license/verify` 查询当前服务端状态，因此暂停、撤销、设备重置和授权过期会在下一次验证时生效。

`completeScript` 功能权限由服务器强制执行。关闭该权限只禁止完整执行脚本，不会让许可证本身失效；重新开启后用户无需再次输入授权码。

设备数量限制由服务端执行。完整执行脚本生成器不再静态内置于公开计算器 HTML，而由 `/api/generate-script` 在授权通过后返回。

## Security

授权码验证使用 HMAC-SHA256；需要在后台查看的完整授权码使用 AES-256-GCM 加密保存；installationId 在数据库中只保存 HMAC。管理员使用 HttpOnly 签名会话 Cookie。

Vercel 环境变量必须包含 `DATABASE_URL`、`ADMIN_PASSWORD`、`SESSION_SECRET`、`LICENSE_PEPPER`。不要提交真实密钥、数据库密码、授权码、Token 或 `.env` 文件。

## Production acceptance

已完成生产环境闭环测试：完整脚本权限关闭/恢复、单设备上限拦截、已激活许可证改为过期后立即在下一次 verify 被拒绝。受保护脚本生成不会绕过这些服务端检查。
