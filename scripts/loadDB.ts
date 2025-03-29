import { DataAPIClient } from "@datastax/astra-db-ts";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import OpenAI from "openai";

import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

import "dotenv/config";

type SimilarityMetrics = "cosine" | "dot_product" | "euclidean"; // Similarity metrics are used to measure the similarity between two vectors.

const {
  ASTRA_DB_KEYSPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  OPENAI_API_KEY,
} = process.env;

const openAi = new OpenAI({
  baseURL: "https://sg.uiuiapi.com/v1",
  apiKey: OPENAI_API_KEY,
});

const f1Data = [
  "https://en.wikipedia.org/wiki/Formula_One",
  "https://en.wikipedia.org/wiki/2024 Formula One World Championship",
  // "https://en.wikipedia.org/wiki/2023 Formula One World Championship",
  // "https://en.wikipedia.org/wiki/2022 Formula One World Championship",
  // "https://www.formula1.com/en/results.html/2024/races.html",
  // "https://www.formula1.com/en/racing/2024.html",
  // "https://www.formula1.com/en/latest/all",
  // "https://www.forbes.com/sites/brettknight/2024/12/10/formula-1s-highest-paid-drivers-2024/",
];

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT!, { keyspace: ASTRA_DB_KEYSPACE });

console.log(`* Connected to DB ${db.id}`);

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512, // Characters in each chunk
  chunkOverlap: 100, // Number of characters to overlap between chunks
});

const createCollection = async (
  similarityMetrics: SimilarityMetrics = "dot_product"
) => {
  const collection: any = await db.createCollection(ASTRA_DB_COLLECTION!, {
    vector: {
      dimension: 1536,
      metric: similarityMetrics,
    },
  });
  console.log(`* Collection ${collection.id} created`);
  console.log(`Collection Data :- ${JSON.stringify(collection)}`);
};

const loadSampleData = async () => {
  const collection = await db.collection(ASTRA_DB_COLLECTION!);
  for await (const url of f1Data) {
    const content: string = await scrapePage(url);

    // console.log(`Content :- ${content}`);

    const chunks = await splitter.splitText(content);

    for await (const chunk of chunks) {
      const embedding = await openAi.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
        encoding_format: "float",
      });

      // console.log(`Embedding ${embedding}`);


      const vector = embedding.data[0].embedding;

      const result = await collection.insertOne({
        $vector: vector,
        text: chunk,
      });

      console.log(result);
    }
  }
};

const scrapePage = async (url: string): Promise<string> => {
  const loader = new PuppeteerWebBaseLoader(url, {
    launchOptions: {
      headless: true,
    },
    gotoOptions: {
      waitUntil: "domcontentloaded",
    },
    evaluate: async (page, browser) => {
      const result = await page.evaluate(() => document.body.innerHTML);
      await browser.close();
      return result;
    },
  });

  return (await loader.scrape())?.replace(/<[^>]*>?/gm, "");
};

createCollection().then(() => loadSampleData());

// const testOpenAi = async () => {
//   const response = await openAi.embeddings.create({
//     model: "text-embedding-3-small",
//     input: "The food was delicious and the waiter...",
//   });
//   console.log(response);
// };

// testOpenAi();