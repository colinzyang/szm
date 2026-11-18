# 给 SZM 美术馆投稿 · Contributing

感谢你为社区馆藏添砖加瓦！上墙有两条通道，任选其一。

## 通道 A：Issue 自动上架（推荐，零代码）

1. 打开 [投稿模板](https://github.com/colinzyang/szm/issues/new?template=exhibit.yml)
2. 贴图、填标题、写介绍、选分类、勾选版权承诺
3. 提交后等馆长打上「**上架**」标签
4. 机器人自动：收图 → 压缩 → 写入馆藏 → 部署上线 → 评论通知你

## 通道 B：PR 直投（极客通道）

1. Fork 本仓库
2. 把图片放进 `static/community/`（建议文件名：`你的ID-作品名.jpg`，≤15MB）
3. 编辑 [`static/gallery-data.js`](static/gallery-data.js)，在 `exhibits` 数组**末尾**追加一条：

```json
{
  "id": "下一个编号",
  "src": "static/community/你的图片.jpg",
  "title": "作品标题",
  "titleEn": "English Title（可留空）",
  "author": "你的GitHubID",
  "year": "2026",
  "medium": "社区投稿",
  "tags": ["摄影"],
  "desc": "一句话介绍这件作品。",
  "from": ""
}
```

4. 发 PR

> 注意：`gallery-data.js` 里 `window.SZM_GALLERY = ` 之后必须是**严格 JSON**（双引号、无注释、无尾逗号），机器人靠它解析。

## 字段说明

| 字段 | 必填 | 说明 |
|------|:---:|------|
| `id` | 是 | 三位数字字符串，全局唯一，取现有最大编号 +1 |
| `src` | 是 | 图片相对路径（`static/` 开头） |
| `title` | 是 | 展签标题，≤40 字 |
| `titleEn` |  | 英文副标题 |
| `author` | 是 | 署名（GitHub ID），会显示在展签上 |
| `year` | 是 | 创作年份 |
| `medium` | 是 | 媒介，如「数码摄影 · 收藏级微喷」 |
| `tags` | 是 | 分类数组；含 `镇馆之宝` 的作品会进入首页特展位 |
| `desc` | 是 | 作品介绍，≤200 字 |
| `from` |  | 来源 Issue 链接（机器人填写，用于去重） |

## 回帖（论坛楼层）

见 [README · 楼层区](README.md#floors)：Fork → 表格末尾加一行 → PR。只加楼，不拆楼。

## 本地预览

```bash
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```

改完 `gallery-data.js` 刷新页面即可看到自己的作品上墙。
