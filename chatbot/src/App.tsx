import React, {useEffect} from 'react';
import Modal from './Modal';
import logo from './logo.svg';
import './App.css';
import { Ollama } from "@langchain/ollama";
import { OllamaEmbeddings } from "@langchain/ollama"
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
// import { OpenAIEmbeddings } from "@langchain/openai";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { createClient } from '@supabase/supabase-js'
import { ChatOllama } from "@langchain/ollama";
import { queries } from '@testing-library/dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Prompt from './Prompt';
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';

//SET ENVIRONMENT VARIABLES IN .ENV FILE
const sbApiKey = process.env.REACT_APP_SUPABASE_API_KEY;
const sbUrl = process.env.REACT_APP_SUPABASE_URL;

if (!sbApiKey || !sbUrl) {
  throw new Error("Supabase API key or URL is missing in environment variables.");
}

const client = createClient(sbUrl, sbApiKey);

const llm = new ChatOllama({
      model: "gemma3n:e4b",
      temperature: 0,
      maxRetries: 2,
    }); //Initialize here to avoid re-initialization on every user input

const convHistory: string[] = []

function App() {
  useEffect(() => {
    document.addEventListener('submit', (e) => {
    e.preventDefault()
    progressConversation()
    })
    // textparser(); //ONLY CALL IT TO VECTORIZE REFERNCE TEXT
  }, []);

  

  return (
  <div>
    {/* The following tags are not valid in JSX and should be placed in public/index.html */}
    {/* <title>Scrimba Chatbot</title>
    <link rel="stylesheet" href="index.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
    <link href="https://fonts.googleapis.com/css2?family=Poppins&family=Roboto&display=swap" rel="stylesheet" /> 
    CHECK*/}

    <div>
      <section className="chatbot-container">
        <div className="chatbot-header">
          {/* <img src="images/logo-scrimba.svg" className="logo" /> */}
          <p className="sub-heading">Chatbot</p>
        </div>
        <div className="chatbot-conversation-container" id="chatbot-conversation-container">
        </div>
        <form id="form" className="chatbot-input-container">
          <input name="user-input" type="text" id="user-input" required />
          <button id="submit-btn" className="submit-btn">
            <img
              src="images/send.svg"
              className="send-btn-icon"
              alt="Send"
            />
          </button>
        </form>
      </section>
      {/* <script src="index.js" type="module"></script> */}
    </div>
    {/* <div>
      <Prompt /> Trying out to print template, enable only for hit and trial
    </div> */}
    {/* <div>
      <Modal /> Trying out Modal-work related to React-Bootstrap
    </div> */}
  </div>
  );
}

async function textparser() {
  try {
    const result = await fetch('data/Context.txt')
    const text = await result.text()

    const splitter = new RecursiveCharacterTextSplitter(
      {
        chunkSize: 500,
        separators: ['\n\n', '\n', ' ', ''],
        chunkOverlap: 50
      }
    )

    // console.log(process.env.REACT_APP_SUPABASE_API_KEY);
    // console.log(process.env.REACT_APP_SUPABASE_URL);
    // console.log(process.env.REACT_APP_OPENAI_API_KEY);

    
    // const openAIApiKey = process.env.REACT_APP_OPENAI_API_KEY;

    const output = await splitter.createDocuments([text]);

    const Embeddings = await SupabaseVectorStore.fromDocuments(
      output,
      new OllamaEmbeddings({
        model: "mxbai-embed-large", // Default value
        baseUrl: "http://localhost:11434", // Default value
      }),
      {
        client,
        tableName: 'documents',
      }
    );

    console.log(Embeddings)


  } 
  
  catch (err) {
    console.log(err)
  }
}

async function StandAloneQuestion(){
  const StandAloneQuestionTemplate = `Given some conversation history (if any) and a question, convert the question to a standalone question. 
  conversation history: {conv_history}
  question: {question} 
  standalone question:`;

  const AnswerTemplate = `You are a helpful and enthusiastic support bot who can answer about Scrimba based on the context provided.
  Try to find the answer in the context.
  If you are not able to do so, say "Kshitij Ohri didn't program me to answer that, I'm just a demo".
  Don't try to make up an answer. Always speak as if you're chatting to a friend.
  context: {context}
  question: {question}
  answer:`;

  const StandAloneQuestionPrompt = PromptTemplate.fromTemplate(
    StandAloneQuestionTemplate
  );

  const AnswerPrompt = PromptTemplate.fromTemplate(AnswerTemplate);

  const retriever = await getContext();

  const standaloneQuestionChain = RunnableSequence.from([
    {
      question: (input: { question: string; conv_history: string }) => input.question,
      conv_history: (input: { question: string; conv_history: string }) => input.conv_history,
    },
    StandAloneQuestionPrompt,
    llm,
    new StringOutputParser(),
  ]);

  const retrieverChain = RunnableSequence.from([
    (prevResult) => prevResult.standalone_question,
    retriever,
    combineDocuments,
  ]);

  const answerChain = RunnableSequence.from([
    {
      context: retrieverChain,
      question: (input) => input.standalone_question,
    },
    AnswerPrompt,
    llm,
    new StringOutputParser(),
  ]);

  const conversationalRetrievalChain = RunnableSequence.from([
    {
      standalone_question: standaloneQuestionChain,
      original_input: new RunnablePassthrough(),
    },
    {
      context: retrieverChain,
      question: ({ original_input }) => original_input.question,
    },
    AnswerPrompt,
    llm,
    new StringOutputParser(),
  ]);

  return conversationalRetrievalChain;
}
async function progressConversation() {
    
  const userInput = document.getElementById('user-input') as HTMLInputElement | null;
  const chatbotConversation = document.getElementById('chatbot-conversation-container');

  if (userInput && chatbotConversation) {
    const question = userInput.value;
    userInput.value = '';

    // add human message
    const newHumanSpeechBubble = document.createElement('div');
    newHumanSpeechBubble.classList.add('speech', 'speech-human');
    chatbotConversation.appendChild(newHumanSpeechBubble);
    newHumanSpeechBubble.textContent = question;
    chatbotConversation.scrollTop = chatbotConversation.scrollHeight;

    try {
      const chain = await StandAloneQuestion();

      // Use lowercase 'question' to match the prompt template
      const aiMsg = await chain.invoke({
        question: question,
        conv_history: formatConvHistory(convHistory)
      });
      
      convHistory.push(question)
      convHistory.push(aiMsg)

      // Add AI message bubble only after receiving response
      const newAiSpeechBubble = document.createElement('div');
      newAiSpeechBubble.classList.add('speech', 'speech-ai');
      newAiSpeechBubble.textContent = String(aiMsg);
      chatbotConversation.appendChild(newAiSpeechBubble);
      chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
    }
    catch (err) {
      console.error(err); // Log the full error for debugging
      // Optionally handle error and show error bubble
      const errorBubble = document.createElement('div');
      errorBubble.classList.add('speech', 'speech-ai');
      errorBubble.textContent = "Sorry, I couldn't process your request.";
      chatbotConversation.appendChild(errorBubble);
      chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
    }
  }
}

async function getContext() {

  const vectorStore = await SupabaseVectorStore.fromExistingIndex(
    new OllamaEmbeddings({
      model: "mxbai-embed-large",
      baseUrl: "http://localhost:11434",
    }),
    {
      client,
      tableName: 'documents',
      queryName: 'match_documents',
    }
  );

  const retriever = vectorStore.asRetriever();

  return retriever;

}

function formatConvHistory(messages: any[]) {
    return messages.map((message, i) => {
        if (i % 2 === 0){
            return `Human: ${message}`
        } else {
            return `AI: ${message}`
        }
    }).join('\n')
}

function combineDocuments(docs: any) {
  return docs.map((doc: { pageContent: string; }) => doc.pageContent).join('\n');
}

export default App;
