'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

type License = {
  id: string; license_prefix: string; license_code: string | null; customer_note: string | null; status: string;
  expires_at: string | null; max_devices: number; active_devices: number; created_at: string;
};

export default function AdminClient() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/licenses', { cache: 'no-store' });
    if (r.status === 401) { setLoggedIn(false); return; }
    const j = await r.json();
    setLicenses(j.licenses ?? []); setLoggedIn(true);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMessage('');
    const fd = new FormData(e.currentTarget);
    const r = await fetch('/api/admin/login', { method:'POST', headers:{'content-type':'application/json'},
      body:JSON.stringify({password:fd.get('password')}) });
    if (!r.ok) { setMessage('登录失败，请检查管理员密码。'); return; }
    e.currentTarget.reset();
    await fetch('/api/admin/schema-upgrade', { method:'POST' });
    await load();
  }

  async function createLicense(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMessage('');
    const fd = new FormData(e.currentTarget);
    const r = await fetch('/api/admin/licenses', { method:'POST', headers:{'content-type':'application/json'},
      body:JSON.stringify({customerNote:fd.get('note'),maxDevices:Number(fd.get('maxDevices')),expiresAt:fd.get('expiresAt')||null}) });
    const j = await r.json();
    if (!r.ok) { setMessage('创建失败：'+(j.error??'unknown')); return; }
    setMessage('授权码已创建：'+j.licenseCode);
    e.currentTarget.reset(); await load();
  }

  async function action(id:string, body:object) {
    const r=await fetch('/api/admin/licenses/'+id,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    if(!r.ok){setMessage('操作失败');return;} setMessage('操作成功'); await load();
  }

  async function remove(id:string, code:string|null) {
    if (!window.confirm('确定永久删除授权 '+(code ?? '')+'？相关设备记录也会删除，此操作不可恢复。')) return;
    const r=await fetch('/api/admin/licenses/'+id,{method:'DELETE'});
    if(!r.ok){setMessage('删除失败');return;} setMessage('授权已永久删除'); await load();
  }

  async function logout(){await fetch('/api/admin/logout',{method:'POST'});setLicenses([]);setLoggedIn(false);setMessage('');}

  if(loggedIn===null)return <p>正在检查管理员会话…</p>;
  if(!loggedIn)return <form className="adminForm" onSubmit={login}><h2>管理员登录</h2>
    <label>管理员密码<input name="password" type="password" autoComplete="current-password" required/></label>
    <button type="submit">登录</button>{message&&<p className="notice">{message}</p>}</form>;

  return <div className="adminPanel">
    <div className="adminTop"><h2>授权管理</h2><button className="secondary" onClick={logout}>退出</button></div>
    <form className="adminForm" onSubmit={createLicense}><h3>创建授权码</h3>
      <label>客户备注<input name="note" maxLength={500} placeholder="例如：客户 A / 订单号"/></label>
      <label>设备上限<input name="maxDevices" type="number" min="1" max="100" defaultValue="1" required/></label>
      <label>到期时间（可留空永久）<input name="expiresAt" type="datetime-local"/></label>
      <button type="submit">生成授权码</button>
    </form>
    {message&&<p className="notice">{message}</p>}
    <div className="licenseList">{licenses.length===0?<p className="muted">暂无授权。</p>:licenses.map(x=>
      <article className="licenseRow" key={x.id}>
        <div><strong>{x.license_code ?? x.license_prefix+'••••（旧授权不可恢复）'}</strong>
          <div className="muted">{x.customer_note||'无备注'}</div></div>
        <div>状态：{x.status}<br/>设备：{x.active_devices}/{x.max_devices}<br/>到期：{x.expires_at?new Date(x.expires_at).toLocaleString():'永久'}</div>
        <div className="rowActions">
          {x.status!=='active'&&<button onClick={()=>action(x.id,{status:'active'})}>恢复</button>}
          {x.status==='active'&&<button onClick={()=>action(x.id,{status:'paused'})}>暂停</button>}
          {x.status!=='revoked'&&<button className="danger" onClick={()=>action(x.id,{status:'revoked'})}>撤销</button>}
          <button className="secondary" onClick={()=>action(x.id,{action:'reset_devices'})}>重置设备</button>
          <button className="danger" onClick={()=>remove(x.id,x.license_code)}>永久删除</button>
        </div>
      </article>)}</div>
  </div>;
}
