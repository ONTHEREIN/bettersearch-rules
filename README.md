# bettersearch-rules

[BetterSearch](https://github.com/ONTHEREIN/BetterSearch) 使用的社区规则列表。

| 文件 | 内容 |
|---|---|
| [`lookalike.txt`](lookalike.txt) | 冒充官网、提供来路不明安装包的网站 |

## 订阅

在 BetterSearch 设置的「屏蔽 → 订阅列表」里添加：

```
https://raw.githubusercontent.com/ONTHEREIN/bettersearch-rules/main/lookalike.txt
```

名单默认不开启，订阅与否由你决定。格式兼容 [uBlacklist](https://github.com/iorate/ublacklist)，也可以直接在 uBlacklist 里订阅。

## 收录标准

一个网站要同时满足以下几点才会收录：

1. 在搜索结果里以官网的身份出现：标题或页面自称「官网」「官方下载」，或者模仿官网的名称和布局。
2. 域名不属于该软件或品牌的所有者。
3. 提供下载、安装包或付费服务。

每条记录都要附上依据：截图、页面存档或下载包的哈希比对，写在对应的 issue 里，名单里注明 issue 编号。只是「排名靠前但内容质量差」的网站不收录，那属于个人屏蔽规则的范畴。

## 举报与申诉

- 发现仿冒站：[提交举报](https://github.com/ONTHEREIN/bettersearch-rules/issues/new?template=report.yml)。BetterSearch 结果卡片上的「举报仿冒」按钮会自动填好域名和搜索词。
- 你的网站被误收录：[提交申诉](https://github.com/ONTHEREIN/bettersearch-rules/issues/new?template=appeal.yml)，说明你和该品牌的关系即可，核实后移除。

## English

Community rule lists for BetterSearch. `lookalike.txt` lists sites that pose as an official site and offer downloads of unknown origin. An entry needs evidence in an issue (screenshots, an archived page, or a hash comparison of the installer). Report a site or appeal a listing with the issue templates above. The list is off by default; subscribe to it in BetterSearch or uBlacklist.

## 许可证 / License

[CC0 1.0](LICENSE)：名单可以自由使用，不需要署名。
