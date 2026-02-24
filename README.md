# 科技早报

记录每天值得分享的科技内容，每天发布。

欢迎投稿文章/软件/资源，请[提交 issue](https://github.com/zaobao-tech/zaobao/issues) 。

## 开源与部署说明

- **百度统计**：统计 ID 不写在代码中。部署时在 GitHub 仓库 Settings → Secrets and variables → Actions 中新增 `BAIDU_ANALYTICS_ID`，值为百度统计中 `hm.js?` 后面的 ID；未设置则不会插入百度统计脚本。
- **站点配置**：`_data/site.json` 中可修改 `baseUrl`、`repoUrl`、`issuesUrl`、`author`、`intro` 等；Fork 部署时请改为自己的信息。
- **自定义域名**：使用 GitHub Pages 自定义域名时，在仓库 Settings → Pages 中设置，并可在 `.github/workflows/deploy.yml` 中把 `www.zaobao.tech` 改为你的域名（或通过 CNAME 文件）。
- **不提交**：`.env`、`.env.*` 已在 `.gitignore` 中，请勿将密钥、统计 ID 等写入仓库。