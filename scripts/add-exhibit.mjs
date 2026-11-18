#!/usr/bin/env node
/**
 * add-exhibit.mjs — SZM 美术馆自动收图上架机器人
 *
 * 在 GitHub Actions (issues: labeled「上架」) 中运行：
 *   1. 从 $GITHUB_EVENT_PATH 读取 Issue 表单
 *   2. 提取图片（附件或直链）下载到 static/community/
 *   3. 追加条目到 static/gallery-data.js
 *   4. 输出摘要供工作流评论 / 提交
 *
 * 本地干跑（不写文件）：
 *   GITHUB_EVENT_PATH=./test-event.json node scripts/add-exhibit.mjs --dry-run
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = join(ROOT, 'static', 'gallery-data.js');
const COMMUNITY_DIR = join(ROOT, 'static', 'community');
const DRY_RUN = process.argv.includes('--dry-run');
const ALLOWED = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

const fail = msg => { console.error(`::error::${msg}`); process.exit(1); };

// ---------- 1. 读取 Issue ----------
const eventPath = process.env.GITHUB_EVENT_PATH;
if (!eventPath || !existsSync(eventPath)) fail('缺少 GITHUB_EVENT_PATH（本地请构造测试事件文件）');
const event = JSON.parse(readFileSync(eventPath, 'utf8'));
const issue = event.issue;
if (!issue) fail('事件里没有 issue');

const body = issue.body || '';
const section = (name) => {
  const re = new RegExp(`###\\s*[^\\n]*${name}[^\\n]*\\n+([\\s\\S]*?)(?=\\n###|$)`);
  const m = body.match(re);
  return m ? m[1].trim() : '';
};

const title = section('作品标题').split('\n')[0].trim() || issue.title.replace(/^🎨\s*/, '');
const desc = section('作品介绍').trim();
const tagRaw = section('分类').split('\n')[0].trim();
const tag = tagRaw && tagRaw !== '_No response_' ? tagRaw : '社区馆藏';
const imgSection = section('作品图片');

// 提取第一个图片 URL：markdown 图片 > 裸链接
const mdImg = imgSection.match(/!\[[^\]]*\]\(([^)\s]+)\)/);
const bareUrl = imgSection.match(/https?:\/\/\S+/);
const imgUrl = (mdImg && mdImg[1]) || (bareUrl && bareUrl[0]);
if (!imgUrl) fail('没有在「作品图片」里找到图片（请粘贴附件或直链）');

// ---------- 2. 读取现有数据 ----------
const raw = readFileSync(DATA_FILE, 'utf8');
const marker = raw.indexOf('window.SZM_GALLERY');
if (marker < 0) fail('gallery-data.js 里找不到 window.SZM_GALLERY');
const jsonText = raw.slice(raw.indexOf('=', marker) + 1).replace(/;\s*$/, '');
let data;
try { data = JSON.parse(jsonText); } catch { fail('gallery-data.js 不是合法的 JSON（请检查最近的手动修改）'); }
if (!Array.isArray(data.exhibits)) fail('gallery-data.js 缺少 exhibits 数组');

// 去重：同一 Issue 不重复上架
if (data.exhibits.some(e => e.from === issue.html_url)) {
  console.log('skipped=true');
  console.log(`id=${data.exhibits.find(e => e.from === issue.html_url).id}`);
  process.exit(0);
}

// ---------- 3. 下载图片 ----------
const ext = (imgUrl.split('?')[0].match(/\.(\w+)$/) || [])[1]?.toLowerCase() || 'png';
if (!ALLOWED.has(ext)) fail(`不支持的图片格式 .${ext}（支持 ${[...ALLOWED].join('/')}）`);

const maxId = data.exhibits.reduce((m, e) => Math.max(m, parseInt(e.id, 10) || 0), 0);
const id = String(maxId + 1).padStart(3, '0');
const fileName = `${id}.${ext}`;
const filePath = join(COMMUNITY_DIR, fileName);

let buf;
try {
  const res = await fetch(imgUrl, { redirect: 'follow' });
  if (!res.ok) fail(`图片下载失败 HTTP ${res.status}`);
  buf = Buffer.from(await res.arrayBuffer());
} catch (e) { fail(`图片下载异常：${e.message}`); }
if (buf.length < 1024) fail('图片太小或损坏（<1KB）');
if (buf.length > 15 * 1024 * 1024) fail('图片超过 15MB 上限');

// ---------- 4. 写入 ----------
if (!DRY_RUN) {
  mkdirSync(COMMUNITY_DIR, { recursive: true });
  writeFileSync(filePath, buf);
  data.exhibits.push({
    id,
    src: `static/community/${fileName}`,
    title: title.slice(0, 40),
    titleEn: '',
    author: issue.user?.login || '匿名',
    year: String(new Date().getFullYear()),
    medium: '社区投稿 · Community Submission',
    tags: [tag],
    desc: (desc || '（作者没有留下介绍，但艺术不言自明。）').slice(0, 200),
    from: issue.html_url,
  });
  const header = raw.slice(0, raw.indexOf('window.SZM_GALLERY'));
  writeFileSync(DATA_FILE, header + 'window.SZM_GALLERY = ' + JSON.stringify(data, null, 2) + ';\n');
}

console.log('skipped=false');
console.log(`id=${id}`);
console.log(`file=${!DRY_RUN ? filePath : '(dry-run 未写入)'}`);
console.log(`title=${title}`);
console.log(`author=${issue.user?.login || '匿名'}`);
console.log(`tag=${tag}`);
