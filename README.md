# bettersearch-rules

[BetterSearch](https://github.com/ONTHEREIN/BetterSearch) 使用的社区规则列表。

| 文件 | 内容 |
|---|---|
| [`lookalike.txt`](lookalike.txt) | 冒充官网、提供来路不明安装包的网站。人工维护 |
| [`sites/`](sites) | 已知网站名单：Wikidata 登记过的所有官网域名，加上 Majestic Million 的全部一百万个域名。每周自动生成 |

## 订阅

在 BetterSearch 设置的「屏蔽 → 订阅列表」里添加：

```
https://raw.githubusercontent.com/ONTHEREIN/bettersearch-rules/main/lookalike.txt
```

名单默认不开启，订阅与否由你决定。格式兼容 [uBlacklist](https://github.com/iorate/ublacklist)，也可以直接在 uBlacklist 里订阅。

## 已知网站名单（sites/）

BetterSearch 默认用它核对搜索结果：标题自称「官网」「官方」、域名却不在名单里的结果会显示提示；名单里注明了品牌名的域名，在搜索词提到该品牌时标上 ✓。

- **来源**：Wikidata 上所有条目的「官方网站」（P856），约 120 万个域名，不区分是哪个品牌的官网；再加上 [Majestic Million](https://majestic.com/reports/majestic-million) 的全部一百万个域名，补上没有 Wikidata 条目的大网站。软件、网站、公司、品牌等常被搜索的条目，还附上了它们的中英文名称和别名。
- **生成**：[`scripts/build.mjs`](scripts/build.mjs)，GitHub Actions 每周一运行，然后推一份到 [Gitee 镜像](https://gitee.com/R3less/bettersearch-rules)。脚本依次从 Gitee、jsDelivr 和 GitHub 下载，国内一般走 Gitee。不要手动修改这个目录。
- **格式**：按主域名的 FNV-1a 哈希前 3 位分成 4096 个分片，每片约 2 KB。脚本只下载所查域名所在的那一片，所以请求里只透露「4096 组里的哪一组」，不透露具体域名。每行是 `域名` 或 `域名 = 名称|名称`，按 JavaScript 默认的字符串顺序排序。
- **出错了**：官网写错或漏了，请直接到 Wikidata 修改对应条目的「官方网站」，下一次生成会自动更新。

## 收录标准（lookalike.txt）

一个网站要同时满足以下几点才会收录：

1. 在搜索结果里以官网的身份出现：标题或页面自称「官网」「官方下载」，或者模仿官网的名称和布局。
2. 域名不属于该软件或品牌的所有者。
3. 提供下载、安装包或付费服务。

每条记录都要附上依据：截图、页面存档或下载包的哈希比对，写在对应的 issue 里，名单里注明 issue 编号。只是「排名靠前但内容质量差」的网站不收录，那属于个人屏蔽规则的范畴。

## 举报与申诉

- 发现仿冒站：[提交举报](https://github.com/ONTHEREIN/bettersearch-rules/issues/new?template=report.yml)。BetterSearch 结果卡片上的「举报仿冒」按钮会自动填好域名和搜索词。
- 你的网站被误收录：[提交申诉](https://github.com/ONTHEREIN/bettersearch-rules/issues/new?template=appeal.yml)，说明你和该品牌的关系即可，核实后移除。

## English

Community rule lists for BetterSearch. `sites/` lists known sites: every domain Wikidata records as an official website, plus all million domains of the Majestic Million. It is built weekly by `scripts/build.mjs`, mirrored to Gitee, and split into 4096 shards by domain hash so a lookup downloads one shard of a few KB. Fix a wrong official site on Wikidata itself. `lookalike.txt` lists sites that pose as an official site and offer downloads of unknown origin. An entry needs evidence in an issue (screenshots, an archived page, or a hash comparison of the installer). Report a site or appeal a listing with the issue templates above. The list is off by default; subscribe to it in BetterSearch or uBlacklist.

## 许可证 / License

- `lookalike.txt` 和脚本：[CC0 1.0](LICENSE)，可以自由使用，不需要署名。
- `sites/`：包含 [Majestic Million](https://majestic.com/reports/majestic-million) 的数据，按 [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) 授权，使用时请注明数据来自 Majestic 和 Wikidata（Wikidata 部分为 CC0）。

`lookalike.txt` and the script are CC0. `sites/` includes data from the Majestic Million under CC BY 3.0; credit Majestic and Wikidata when you use it.
