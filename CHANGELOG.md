### 🆕 New Features
  * none

### 🛠️ Bug Fixes
  * Fork 修复：将测试版的 WeatherKit v3 空气质量、缺失分钟降水与已有预警补全接入正式版，保留无法解析的产品和其他原始数据集。
  * Fork 修复：正式模块补充 v2/v3 请求和 v3 二进制响应规则，v3 请求复用 macOS country 补全；正式脚本下载地址指向 615884247/WeatherKit。
  * 修复 WeatherKit Response 处理范围未同时受用户设置和 URL `dataSets` 约束的问题：现在只处理两者的交集，避免地图天气小组件只请求当前天气与空气质量时扩展处理其他数据集。
  * 修复和风天气历史空气质量接口路径多余斜杠的问题，确保请求使用正确的 `/v7/historical/air` 路径。
  * 修复和风天气 CO 浓度的重复换算问题：仅在明确标注 mg/m3 时换算为 µg/m3，Apple 原始产品的 CO 误标场景仅在 Apple 产品入口处理（参考 WeatherKit PR #107 的幂等修复）。
  * 修复空气质量指数边界比较的二进制浮点误判，为取整比较增加 EPSILON 容差。

### 🔣 Dependencies
  * 将 FlatBuffer Root 处理器迁移至已发布的 `@nsnanocat/flatbuffer-root@1.0.0`，移除仓库内重复实现。
  * 更新 `@nsnanocat/util` 至 `2.7.5`，使 `PersistentStore` 与未设置 `Storage` 时保持一致。
  * 更新 `@nsringo/weatherkit` 至 `2.0.0`：协议包入口重组为 `Common`/`WK2`/`WK3` 三个命名空间；共用构造器经 `WK2.Common.ForecastMinute`、`WK2.Common.UUID` 引用；`MatchEnum` 改为按请求版本在内部选择枚举表。

### ‼️ Breaking Changes
  * none

### 🔄 Other Changes
  * 从 BoxJs 设置中隐藏 `Storage` 选项，保留 `$argument` 配置，并将默认值改为 `PersistentStore`；默认优先级为 `database -> $argument -> PersistentStore (BoxJs)`。
  * v3 响应中已请求但解析失败的空气质量数据保留 Apple 原始包，不再误判为缺失并注入；补充 WK3 解码失败边界、dist 产物平台模拟回放等回归测试。
  * 补充数据集交集、用户设置过滤、FlatBuffer 根槽映射和 QWeather 接口路径的回归测试。
