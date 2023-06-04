import { OpenAI } from 'langchain/llms/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { ConversationalRetrievalQAChain } from 'langchain/chains';
import {ChatOpenAI} from "langchain/chat_models";

// const CONDENSE_PROMPT = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.
//
// Chat History:
// {chat_history}
// Follow Up Input: {question}
// Standalone question:`;


const CONDENSE_PROMPT = `给定以下对话和一个后续问题，请重新表述后续问题成一个独立的问题。

聊天记录:
{chat_history}

后续输入问题:
{question}

独立问题:`;



// You are a helpful AI assistant. Use the following pieces of context to answer the question at the end.
//     If you don't know the answer, just say you don't know. DO NOT try to make up an answer.
//     If the question is not related to the context, politely respond that you are tuned to only answer questions that are related to the context.

const QA_PROMPT = `
您是一个AI助手，提供有用的建议。您得到了以下长文档的提取部分和一个问题。根据提供的上下文进行交流式回答。
  您只应提供引用下面上下文的超链接。不要编造超链接。
  如果您在下面的上下文中找不到答案，请说“嗯，我不确定。”不要试图编造答案。
  如果问题与上下文无关，请礼貌地回应，您只能用回答与上下文有关的问题，而且只能用简体中文回答。 
{context}

问题: {question}
将答案用markdown的形式返回:`;

export const makeChain = (vectorstore: PineconeStore) => {
  const model = new ChatOpenAI({
    temperature: 0, // increase temepreature to get more creative answers
    modelName: 'gpt-3.5-turbo', //change this to gpt-4 if you have access
  },{basePath:'https://api.openai-sb.com/v1'});


  const chain = ConversationalRetrievalQAChain.fromLLM(
    model,
    vectorstore.asRetriever(),
    {
      qaTemplate: QA_PROMPT,
      questionGeneratorTemplate: CONDENSE_PROMPT,
      returnSourceDocuments: true, //The number of source documents returned is 4 by default
    },
  );


  return chain;

};