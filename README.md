# Illustration Remix Generate

一个基于 `Next.js 16` 和 `Gemini` 的插画风格生成工具。

用户上传一张参考插画后，应用会先提取风格特征，再让用户描述新主题，最后用参考图风格和文字描述一起生成新的插画结果。

## 功能

- 上传参考插画，提取风格关键词、英文摘要和中文摘要
- 支持背景识别，并在生成时控制是否保留参考图背景
- 支持二次修改 Prompt 和手动覆盖最终生图指令
- 支持多张并行生成
- 对上传格式、上传体积、生成参数和请求频率做基础校验
- 内置回归测试，覆盖关键状态流和核心路由校验

## 技术栈

- `next@16.2.2`
- `react@19`
- `@google/genai`
- `tailwindcss@4`
- `vitest`

## 本地运行

先安装依赖：

```bash
npm install
```

创建环境变量文件 `.env.local`：

```bash
GEMINI_API_KEY=your_api_key_here
```

启动开发环境：

```bash
npm run dev
```

打开 `http://localhost:3000`。

## 常用命令

```bash
npm run dev
npm run build
npm run start
npm test
npm run test:watch
```

## 测试

当前测试覆盖：

- `__tests__/generation-flow-reducer.test.ts`
  - 换参考图时是否清空旧风格、旧 Prompt 和旧结果
  - 全失败与部分成功时的终态错误处理
- `__tests__/generate-image-route.test.ts`
  - `generate-image` 参数校验
  - 非法生成数量拦截
  - 参考图 MIME 校验
  - 基础限流
- `__tests__/extract-style-route.test.ts`
  - 缺少图片
  - 非法图片格式
  - 超过 10MB 的上传

## 关键目录

```text
app/
  api/
    extract-style/route.ts
    refine-prompt/route.ts
    edit-prompt/route.ts
    generate-image/route.ts
  page.tsx

hooks/
  useGenerationFlow.ts

lib/
  gemini.ts
  prompts.ts
  image-utils.ts
  types.ts

__tests__/
```

## 当前实现说明

- 当前 UI 是单页流，不再保留旧的多步骤组件实现
- 参考图切换时会清空下游状态，并中止旧请求，避免旧响应污染新状态
- 生图接口会在进入 Gemini 前完成参数和速率校验
- 上传只支持 `JPG`、`PNG`、`WebP`，大小上限为 `10MB`

## 部署提示

- 部署前必须配置 `GEMINI_API_KEY`
- 如果要公开使用，建议把当前内存限流升级为共享存储实现，例如 Redis 或 KV
- 如果需要更严格的访问控制，建议继续补鉴权和调用配额
