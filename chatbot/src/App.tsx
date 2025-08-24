import React, {useEffect} from 'react';
import logo from './logo.svg';
import './App.css';
import { Ollama } from "@langchain/ollama";
import { OllamaEmbeddings } from "@langchain/ollama"
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
// import { OpenAIEmbeddings } from "@langchain/openai";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { createClient } from '@supabase/supabase-js'
function App() {
  useEffect(() => {
    textparser();
  }, []);

  

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
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

    const sbApiKey = process.env.REACT_APP_SUPABASE_API_KEY;
    const sbUrl = process.env.REACT_APP_SUPABASE_URL;
    // const openAIApiKey = process.env.REACT_APP_OPENAI_API_KEY;

    if (!sbUrl || !sbApiKey) {
      throw new Error('Supabase URL or API Key is missing in environment variables.');
    }

    const client = createClient(sbUrl, sbApiKey)

    const output = await splitter.createDocuments([text]);

    const print = await SupabaseVectorStore.fromDocuments(
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

    console.log(print)
  } 
  
  catch (err) {
    console.log(err)
  }
}

export default App;
