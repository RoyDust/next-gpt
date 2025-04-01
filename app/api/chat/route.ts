// 导入必要的依赖
import { OpenAI } from "@langchain/openai";
import { OpenAI as openAIEmbeddings } from "openai";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { DataAPIClient } from "@datastax/astra-db-ts";

// 从环境变量中获取必要的配置信息
const {
  OPENAI_API_KEY, // OpenAI API密钥
  ASTRA_DB_NAMESPACE, // Astra数据库命名空间
  ASTRA_DB_COLLECTION, // Astra数据库集合名称
  ASTRA_DB_API_ENDPOINT, // Astra数据库API端点
  ASTRA_DB_TOKEN, // Astra数据库访问令牌
} = process.env;

// 初始化OpenAI客户端实例
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// 初始化OpenAI Embedding客户端实例
const openEmbedding = new openAIEmbeddings({
  apiKey: OPENAI_API_KEY,
  baseURL: "https://sg.uiuiapi.com/v1",
});

// 初始化Astra数据库客户端
const client = new DataAPIClient(ASTRA_DB_TOKEN);

// 连接到指定的数据库和命名空间
const db = client.db(ASTRA_DB_API_ENDPOINT!, {
  namespace: ASTRA_DB_NAMESPACE,
});

// API路由处理函数
export async function POST(req: Request) {
  try {
    // 解析请求体，获取消息数组和最新消息
    const { messages } = await req.json();
    const latestMessage = messages[messages?.length - 1]?.content;

    let docContext = "";

    // 为最新消息生成文本嵌入向量
    const embedding = await openEmbedding.embeddings.create({
      model: "text-embedding-3-small",
      input: latestMessage,
      encoding_format: "float",
    });

    try {
      // 在向量数据库中执行相似性搜索
      const collection = db.collection(ASTRA_DB_COLLECTION!);
      const cursor = collection.find(null, {
        sort: {
          $vector: embedding.data[0].embedding, // 使用生成的向量进行相似度排序
        },
        limit: 10, // 限制返回前10个最相似的文档
      });

      // 获取搜索结果并提取文本内容
      const documents = await cursor.toArray();
      const docsMap = documents?.map((doc) => doc.text);

      docContext = JSON.stringify(docsMap);
      console.log("docContext", docContext);
    } catch (error) {
      console.error(error);
      docContext = "";
    }

    // 构建系统提示模板，包含上下文信息
    const template = {
      role: "system",
      content: `
                You are an AI assistant who knows everything about Formula One. Use the below context to augment what you know about Formula One racing. The context will provide you with the most recent page data from wikipedia, the official F1 website and others. If the context doesn't include the info you need answer based on your existing knowledge and don't mention the source of your info or what the context does or doesn't include. Format responses using markdown where applicable and don't return images.

                -----------------------
                START CONTEXT
                ${docContext}
                END CONTEXT
                -----------------------
                QUESTION: ${latestMessage}
                -----------------------
            `,
    };

    // 调用OpenAI Chat API生成回答
    const response = await openEmbedding.chat.completions.create({
      model: "gpt-4",
      stream: true, // 启用流式响应
      messages: [template, ...messages],
    });

    // 将OpenAI的响应转换为流式响应
    const stream = OpenAIStream(response);

    // 返回流式响应
    return new StreamingTextResponse(stream);
  } catch (e) {
    throw e;
  }
}
