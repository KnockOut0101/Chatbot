import React, {useEffect, useState} from 'react';
import { ChatOllama } from "@langchain/ollama";
import { PromptTemplate } from "@langchain/core/prompts";



function Prompt() {
    const [output, setOutput] = useState('');

    useEffect(() => {
    const fetchOutput = async () => {
      const result = await Prompts();
    //   setOutput(result);
    };
    fetchOutput();
  }, []);


  return (
    <div>
      <p>{output}</p>
    </div>
  );
}

async function Prompts()
{
    const llm = new ChatOllama({
        model: "gemma3n:e4b",
        baseUrl: "http://localhost:11434",
        temperature: 1,
    });


    const template = "You are a helpful assistant that helps people with their questions.{context}";

    const promptTemplate = PromptTemplate.fromTemplate(
        template
    );

    const PromptChain = promptTemplate.pipe(llm);

    const output = PromptChain.invoke({context: "dogs"})
    console.log((await output).content);
    return output;
}

export default Prompt;