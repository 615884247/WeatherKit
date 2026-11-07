#  iRingo: 🌤 WeatherKit

## 本 Fork 的修改

基于上游 `dev` 提交 `b4a75db748641472ec9e36e055080cd06cd4c55b`，参考作者公开 Gist `862db28df04be7523476d10b61b128f2` 的 `50490567d6cb5aa78778f050f18396f2c5bef4d7` 快照，将 v3 修复接入正式版。

- 正式版处理 v3 空气质量、补充物理缺失的分钟降水，并补全已有天气预警；其他 v3 产品保持原始数据。
- 解析失败的产品保留原包，不向其注入第三方数据；用户设置与 URL 请求的数据集共同限制处理范围。
- 正式插件补齐 v2/v3 请求规则和 v3 二进制响应规则，复用 macOS country 补全。
- 保留上游开发分支的一氧化碳单位换算、空气质量边界判断、稀疏根槽和协议依赖修复。
- 正式模块下载本 Fork 的版本化 Release 脚本；开发模块仍指向作者测试 Gist。

## 构建与验证

需要 Node.js 26 和能读取上游 GitHub Packages 的凭据。将凭据保存在本机环境变量 `NODE_AUTH_TOKEN`，GitHub Actions 默认使用只读 Packages 权限的 `GITHUB_TOKEN`，如上游包仍限制访问，则需要仓库 Secret `PACKAGE_TOKEN`。不要将凭据提交到代码。

运行 `npm ci`、`npm run build`、`npm run build:dev`、`npm test` 验证脚本，再运行 `npm run build:args` 生成发布模块。完整模块构建包含 Egern 转换，需要 Puppeteer Chrome。

Loon 产物为 `dist/iRingo.WeatherKit.lpx`。版本 `v3.3.3` 的 Release 必须同时包含该文件、`request.bundle.js` 和 `response.bundle.js`，随后才能使用对应下载链接。

GitHub Actions 已成功下载依赖、构建正式脚本并生成各平台模块。构建流程同时执行开发版构建和完整回归测试，独立检查运行模块规则与固定测试版源码回放。未进行 Apple 天气实机和真实第三方 API 验证。

不依赖 npm 凭据的检查：`node --test tests/severeWeatherRewriteModules.test.mjs`；将上述 Gist 克隆并检出固定快照后，运行 `node tests/referenceReplay.mjs /path/to/gist`。该回放校验引用文件 SHA-256，加载编辑后的正式处理器，模拟第三方数据并禁止真实 HTTP 请求。`Fork regression checks` 工作流执行相同检查；它不替代 npm 完整构建和实机验证。

上游 Gist 发布任务仅在上游仓库运行；本 Fork 不向作者的测试 Gist 发布文件。
