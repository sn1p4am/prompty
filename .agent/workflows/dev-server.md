---
description: Prompty 项目开发规则
---

## 自动重启规则

当对以下类型的文件进行修改时，需要重启 Vite 开发服务器以应用更改：

- `src/services/*.js` - API 客户端逻辑
- `src/hooks/*.js` - React Hooks
- `src/components/*.jsx` - React 组件
- `src/constants/*.js` - 常量配置
- `vite.config.js` - Vite 配置
- `tailwind.config.js` - TailwindCSS 配置
- `package.json` - 依赖配置

## 重启命令

// turbo
```bash
pkill -f "vite" 2>/dev/null; sleep 2; npm run dev -- --host
```

工作目录: `/home/halo/md/prompty`

## 注意事项

1. 修改上述文件后，必须自动执行重启命令
2. Vite 的热更新 (HMR) 通常可以处理简单的组件修改，但涉及 hooks、services 的重大逻辑变化需要完整重启
3. 重启后等待 "VITE v7 ready" 输出即表示服务就绪
