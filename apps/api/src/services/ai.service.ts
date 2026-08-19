import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'

import { aiAnalysisSchema } from '../schemas/ai'

const SYSTEM_PROMPT = `
你是一名专业的校园二手商品识别与估价助手。

你的任务是根据用户上传的 1～3 张商品照片和补充说明，
生成适合校园二手交易场景使用的商品信息。

要求：

1. 识别商品是什么。
2. 判断商品所属分类。
3. 根据外观、磨损、包装、配件等信息判断成色。
4. 结合合理的中国大陆二手市场认知给出人民币估价区间。
5. 生成简洁、真实、不夸大的商品标题。
6. 生成 1～5 个有实际意义的标签。
7. 生成适合校园二手群发布的中文商品描述。

分类只能是：
- digital：数码
- books：书籍
- daily：生活用品
- sports：运动
- clothing：服饰
- other：其他

成色只能是：
- new：全新/未使用
- like_new：接近全新
- good：正常使用、成色良好
- fair：有明显使用痕迹但功能正常
- poor：成色较差

priceMin 和 priceMax：
- 单位是人民币“元”
- 必须为非负整数
- priceMin 必须小于等于 priceMax

不要虚构照片和用户描述中无法确定的具体配件、购买时间、
保修状态或型号细节。
`

function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  return new OpenAI({
    apiKey,
    ...(process.env.BASE_URL
      ? {
          baseURL: process.env.BASE_URL,
        }
      : {}),
  })
}

export async function analyzeProduct(files: File[], description?: string) {
  const openai = createOpenAIClient()

  if (process.env.ENABLE_MODERATION === 'true') {
    const inputs = [
      ...(description?.trim()
        ? [
            {
              type: 'text' as const,
              text: description.trim(),
            },
          ]
        : []),
      ...(await Promise.all(
        files.map(async (file) => ({
          type: 'image_url' as const,
          image_url: {
            url: `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString('base64')}`,
          },
        })),
      )),
    ]

    const moderation = await openai.moderations.create({
      model: 'omni-moderation-latest',
      input: inputs,
    })

    if (moderation.results.some((result) => result.flagged)) {
      throw new Error('图片或文字未通过内容安全检查')
    }
  }

  const imageInputs = await Promise.all(
    files.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer())

      const base64 = buffer.toString('base64')

      return {
        type: 'input_image' as const,
        image_url: `data:${file.type};base64,${base64}`,
        detail: 'auto' as const,
      }
    }),
  )

  const userText = description?.trim()
    ? `
请分析这些商品照片。

用户补充说明：
${description.trim()}
`
    : `
请分析这些商品照片。
用户没有提供额外说明。
`

  const response = await openai.responses.parse({
    model: process.env.AI_MODEL ?? 'gpt-5.6',

    input: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },

      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: userText,
          },

          ...imageInputs,
        ],
      },
    ],

    text: {
      format: zodTextFormat(aiAnalysisSchema, 'product_analysis'),
    },
  })

  if (!response.output_parsed) {
    throw new Error('AI did not return structured output')
  }

  const result = response.output_parsed

  if (result.priceMin > result.priceMax) {
    throw new Error('AI returned an invalid price range')
  }

  return result
}
