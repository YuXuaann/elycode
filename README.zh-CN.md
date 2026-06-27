# elycode

<p align="center">
  <a href="./README.md">English</a> | <a href="./README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <img src="./media/icon.png" alt="elycode" width="240">
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=yuxuaan.elycode">
    <img src="https://img.shields.io/badge/VS%20Marketplace-007ACC?logo=visualstudiocode&logoColor=white" alt="VS Marketplace">
  </a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="MIT License"></a>
</p>

`elycode` 是一个一站式 VS Code 插件，用于竞赛编程练习。它支持代码管理、测试和提交等一体化工作流。

## 主要功能

- **导入**：从竞赛 URL 导入题目数据，无需登录，也无需浏览器插件
- **测试**：支持样例测试、与样例答案对比，以及添加自定义测试用例
- **提交**：支持跳转到题目提交页面，并查看历史提交记录
- **展示**：在侧边栏清晰展示题目信息、样例、竞赛和提交统计
- **代码**：自动生成对应的 C++ 源文件（`.cpp`），自动检测 GCC，并支持 Windows 上的 GCC 自动下载和配置（未来会支持更多语言）
- **主题**：支持 VS Code 明暗主题

## 快速开始

1. 打开 VS Code 并安装 `elycode` 插件。
2. 打开 `elycode` 侧边栏视图。
3. 点击添加竞赛按钮并输入竞赛 URL，该 URL 必须包含本场竞赛的 ID。
4. 展开竞赛，点击题目即可打开编码界面。
5. 在编码界面中，左侧为代码区，右侧为题目信息区，支持样例和自定义测试运行。
6. 可选：如需显示提交历史等数据，请在配置中设置 `elycode.platform.codeforces.UserName` 和 `elycode.platform.luogu.UserName`。`elycode` 会每隔 `elycode.platform.updateContestInfoInterval(seconds)` 秒自动刷新数据，也可以通过按钮手动刷新。

## 支持系统

- Linux: Ubuntu 22.04
- Windows: Windows 11

## 支持平台

- [x] Codeforces
- [x] Luogu
- [ ] AtCoder
- [ ] 其他常见竞赛平台

## 配置

插件提供以下 VS Code 设置：

- `elycode.compiler.detectMode`: `auto detect(gcc)` 或 `custom(gcc)`。
- `elycode.compiler.customPath`: 自定义 GCC 路径，仅在 `custom(gcc)` 模式下使用。
- `elycode.compiler.extraParams`: 额外编译参数，默认 `-std=c++17`。
- `elycode.running.timeLimit(seconds)`: 运行时间上限，默认 2 秒。
- `elycode.running.memoryLimit(MB)`: 运行内存上限，默认 256 MB。
- `elycode.code.templateMode`: 代码模板模式，`auto` 或 `custom`。
- `elycode.code.customTemplate`: 自定义模板，仅在 `custom` 模式下使用。
- `elycode.platform.codeforces.UserName`: Codeforces 用户名。
- `elycode.platform.luogu.UserName`: Luogu 用户名。
- `elycode.platform.updateContestInfoInterval(seconds)`: 自动刷新竞赛数据的间隔秒数，默认 60 秒。

## 开发与构建

本项目使用 TypeScript 开发。

```bash
npm install
npm run compile
npm run watch
```

- `npm run compile`: 编译 TypeScript 源码。
- `npm run watch`: 启动 TypeScript watch 模式。

由于已配置 VS Code 插件开发环境，你也可以通过 VS Code 的调试配置在扩展开发环境中进行测试开发。

## 许可

MIT License

## 说明

该扩展由个人业余时间开发，可能仍存在各种问题或 Bug，欢迎反馈和提交 PR。

⭐ 祝大家在 ACM 或 OI 生涯中取得优异成绩。 ⭐
