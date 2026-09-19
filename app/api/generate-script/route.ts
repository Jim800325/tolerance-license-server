import { NextRequest, NextResponse } from 'next/server';
import { hashInstallationId } from '../../../lib/crypto';
import { getDb } from '../../../lib/db';
import { getLicenseAvailability, LicenseStatus } from '../../../lib/license';
import { verifyLicenseToken } from '../../../lib/license-token';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};
export function OPTIONS(){return new NextResponse(null,{status:204,headers:corsHeaders});}
function json(body:object,status=200){return NextResponse.json(body,{status,headers:corsHeaders});}

type Row={keyCode?:string;data?:string;claimed?:string;spec?:string;min?:string;max?:string;unit?:string;approval?:string};

function buildScript(rows:Row[],keyCode:string,mode:string){
  const payload={version:'v7.1-server',mode:mode==='dim4'?'dim4':'dim2',keyCode,generatedAt:new Date().toISOString(),
    rows:rows.map(r=>({keyCode:keyCode||r.keyCode||'',data:r.data||'',claimed:r.claimed??'--',spec:r.spec??'',min:r.min??'',max:r.max??'',unit:r.unit||'',approval:r.approval||''}))};
  const p=JSON.stringify(payload).replace(/</g,'\\u003c');
  return `(async function(){"use strict";var P=${p},rows=P.rows||[],MODE=P.mode==="dim4"?"每产品4行":"每产品2行";
function sleep(ms){return new Promise(function(r){setTimeout(r,ms)})}
function setVal(el,v){if(!el||el.type==="file")return;var d=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),"value");if(d&&d.set)d.set.call(el,v==null?"":String(v));else el.value=v==null?"":String(v);el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}))}
function container(){var a=Array.from(document.querySelectorAll('tbody.dynamic-lines[data-model^="measurement-chart-"], tbody[id$="-measurement-chart-lines-container"]'));var v=a.filter(function(e){return e.offsetParent!==null});if(v.length)return v[0];if(a.length)return a[0];throw new Error("找不到 Measurement Chart 动态行容器。")}
function allRows(c){return Array.from(c.children).filter(function(e){return e.tagName==="TR"&&e.querySelector('[data-field="data"]')})}
function emptyRows(c){return allRows(c).filter(function(tr){var d=tr.querySelector('[data-field="data"]');return d&&(!d.value||d.value.trim()===""||d.value.trim()==="--")})}
function addButton(c){var b=Array.from(document.querySelectorAll("a.add-row")).find(function(a){return a.getAttribute("href")==="#"+c.id});if(!b)throw new Error('找不到 Measurement Chart 的 "+ Add a line" 按钮。');return b}
async function ensure(c,n){var b=addButton(c),added=0,guard=0;while(emptyRows(c).length<n){var before=allRows(c).length;b.click();var changed=false;for(var i=0;i<40;i++){await sleep(100);if(allRows(c).length>before){changed=true;break}}if(!changed)throw new Error("点击 Add a line 后未检测到新行。");added++;if(++guard>n+20)throw new Error("自动增加行异常，已停止。")}return added}
function product(sel,key){if(!sel)return false;var w=String(key||"").trim(),opts=Array.from(sel.options),t=opts.find(function(o){return String(o.value).trim()===w||String(o.textContent).trim()===w});if(!t){var ne=opts.filter(function(o){return String(o.value).trim()!==""});if(ne.length===1)t=ne[0]}if(!t)return false;sel.value=t.value;sel.dispatchEvent(new Event("input",{bubbles:true}));sel.dispatchEvent(new Event("change",{bubbles:true}));return true}
function field(tr,n,v){var e=tr.querySelector('[data-field="'+n+'"]');if(e)setVal(e,v);return !!e}
function fill(tr,r){if(!product(tr.querySelector('select[data-field="product"]'),r.keyCode||P.keyCode))throw new Error("KeyCode 未找到："+(r.keyCode||P.keyCode));["data","claimed","spec","min","max","unit"].forEach(function(n){if(!tr.querySelector('[data-field="'+n+'"]'))throw new Error('当前行找不到 data-field="'+n+'"')});field(tr,"data",r.data);field(tr,"claimed",r.claimed);field(tr,"spec",r.spec);field(tr,"min",r.min);field(tr,"max",r.max);field(tr,"unit",r.unit);field(tr,"approval-sample",r.approval||"");for(var n=1;n<=13;n++)field(tr,"sample-"+n,n>=6?"--":"")}
try{if(!rows.length)throw new Error("执行脚本中没有可填写的数据。");console.log("Measurement Chart v7.1 授权执行脚本启动");var c=container(),before=emptyRows(c).length,need=Math.max(0,rows.length-before),added=need?await ensure(c,rows.length):0,targets=emptyRows(c);if(targets.length<rows.length)throw new Error("自动增加行后仍没有足够空白行。");for(var i=0;i<rows.length;i++){fill(targets[i],rows[i]);if((i+1)%5===0)await sleep(30)}alert("Measurement Chart 自动填充完成！\\n\\n模式："+MODE+"\\n成功："+rows.length+" 行\\n自动新增："+added+" 行\\n\\nSamples #1–#5：留空\\nSamples #6–#13：--\\n\\n请核对后再保存。")}catch(e){console.error(e);alert("自动填充停止：\\n"+(e&&e.message?e.message:e)+"\\n\\n请检查当前页面和已填写内容。")}})();`;
}

export async function POST(request:NextRequest){
  try{
    const body=await request.json();
    const token=typeof body?.token==='string'?body.token:'';
    const installationId=typeof body?.installationId==='string'?body.installationId.trim():'';
    const rows=Array.isArray(body?.rows)?body.rows:[];
    const keyCode=typeof body?.keyCode==='string'?body.keyCode.trim().slice(0,100):'';
    const mode=body?.mode==='dim4'?'dim4':'dim2';
    if(!token||installationId.length<12||installationId.length>200||!rows.length||rows.length>500)return json({ok:false,error:'invalid_request'},400);
    const payload=verifyLicenseToken(token);
    if(!payload)return json({ok:false,error:'invalid_or_expired_token'},401);
    const ih=hashInstallationId(installationId);
    if(ih!==payload.installationHash)return json({ok:false,error:'device_mismatch'},403);
    const sql=getDb();
    const found=await sql`SELECT l.status,l.expires_at,l.features,d.id AS device_id FROM licenses l JOIN license_devices d ON d.license_id=l.id WHERE l.id=${payload.licenseId} AND d.installation_hash=${ih} AND d.revoked_at IS NULL LIMIT 1`;
    if(!found.length)return json({ok:false,error:'license_or_device_revoked'},403);
    const a=getLicenseAvailability(found[0].status as LicenseStatus,found[0].expires_at as string|null);
    if(!a.valid)return json({ok:false,error:a.reason},403);
    const features=(found[0].features&&typeof found[0].features==='object')?found[0].features:{};
    if((features as Record<string,unknown>).completeScript===false)return json({ok:false,error:'feature_not_enabled'},403);
    const safeRows:Row[]=rows.map((r:any)=>({keyCode:String(r?.keyCode??'').slice(0,100),data:String(r?.data??'').slice(0,500),claimed:String(r?.claimed??'--').slice(0,200),spec:String(r?.spec??'').slice(0,500),min:String(r?.min??'').slice(0,500),max:String(r?.max??'').slice(0,500),unit:String(r?.unit??'').slice(0,50),approval:String(r?.approval??'').slice(0,200)}));
    await sql`UPDATE license_devices SET last_seen_at=NOW() WHERE id=${found[0].device_id}`;
    return json({ok:true,script:buildScript(safeRows,keyCode,mode)});
  }catch(error){console.error('Generate script failed',error);return json({ok:false,error:'generate_script_failed'},500)}
}
