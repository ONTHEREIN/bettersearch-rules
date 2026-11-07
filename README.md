# bettersearch-rules

[BetterSearch](https://github.com/ONTHEREIN/BetterSearch) 使用的社区规则列表。

| 文件 | 内容 |
|---|---|
| [`lookalike.txt`](lookalike.txt) | 冒充官网、提供来路不明安装包的网站。人工维护 |
| [`official.txt`](official.txt) | 官网登记表：品牌名 → 官方网站。每周从 Wikidata 自动生成 |
| [`popular.txt`](popular.txt) | 被链接最多的 20 万个域名，用来区分常见网站和陌生网站。每周从 Majestic Million 自动生成 |

## 订阅

在 BetterSearch 设置的「屏蔽 → 订阅列表」里添加：

```
https://raw.githubusercontent.com/ONTHEREIN/bettersearch-rules/main/lookalike.txt
```

名单默认不开启，订阅与否由你决定。格式兼容 [uBlacklist](https://github.com/iorate/ublacklist)，也可以直接在 uBlacklist 里订阅。

## 自动生成的列表

`official.txt` 和 `popular.txt` 由 [`scripts/build-official.mjs`](scripts/build-official.mjs) 生成，GitHub Actions 每周一运行一次，不要手动修改。BetterSearch 默认订阅这两份列表，用来给官网加 ✓ 标记，以及提示「自称官网、却不在登记表里也不常见」的网站。

- **官网数据**来自 Wikidata 的「官方网站」（P856）属性。收录范围：软件、网站、在线服务、编程语言（至少 3 个维基百科语言版本有条目），公司、银行、品牌（至少 5 到 10 个），以及其他至少 20 个语言版本有条目、官网又在常见网站前 10 万名里的条目，地点和人物除外。
- **官网写错了，或者漏了某个官网**，请直接到 Wikidata 上修改对应条目的「官方网站」，下一次生成时会自动更新。这里不接受针对这两份文件的修改。
- 每行一个关键词，按 JavaScript 默认的字符串顺序排序，脚本直接在原始文本上二分查找。

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

Community rule lists for BetterSearch. `official.txt` (brand → official site, from Wikidata's "official website" property) and `popular.txt` (the 200,000 most-linked domains, from the Majestic Million) are generated weekly by `scripts/build-official.mjs`; fix a wrong official site on Wikidata itself. `lookalike.txt` lists sites that pose as an official site and offer downloads of unknown origin. An entry needs evidence in an issue (screenshots, an archived page, or a hash comparison of the installer). Report a site or appeal a listing with the issue templates above. The list is off by default; subscribe to it in BetterSearch or uBlacklist.

## 许可证 / License

- `lookalike.txt`、`official.txt` 和脚本：[CC0 1.0](LICENSE)，可以自由使用，不需要署名。`official.txt` 的数据来自 Wikidata，Wikidata 本身也是 CC0。
- `popular.txt`：数据来自 [Majestic Million](https://majestic.com/reports/majestic-million)，按 [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) 授权，使用时请注明出处为 Majestic。

`lookalike.txt`, `official.txt` and the script are CC0. `popular.txt` is from the Majestic Million under CC BY 3.0; credit Majestic when you use it.
