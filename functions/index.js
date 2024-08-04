const functions = require("firebase-functions");
const { Configuration, OpenAIApi } = require("openai");
const fs = require('fs');
const path = require('path');

const configuration = new Configuration({
  apiKey: functions.config().openai.apikey,
});
const openai = new OpenAIApi(configuration);

const promptPath = path.join(__dirname, 'prompt.txt');
const systemPrompt = fs.readFileSync(promptPath, 'utf8');

exports.getFirebaseConfig = functions.https.onRequest((request, response) => {
  response.json(JSON.parse(functions.config().app.config));
});

exports.processMessage = functions.https.onRequest(async (request, response) => {
  console.log("전체 요청 내용:");
  console.log("Method:", request.method);
  console.log("URL:", request.url);
  console.log("Headers:", JSON.stringify(request.headers, null, 2));
  console.log("Body:", JSON.stringify(request.body, null, 2));
  console.log("Query:", JSON.stringify(request.query, null, 2));
  console.log("Params:", JSON.stringify(request.params, null, 2));
  console.log("Raw body:", request.rawBody ? request.rawBody.toString() : "없음");

  const processOpenAIResponse = async (result) => {
    console.log("OpenAI API 응답:", JSON.stringify(result.data, null, 2));
    
    let reply = '';
    let functionCall = null;
    let newContext = request.body.context;
    
    if (result.data.choices && result.data.choices.length > 0) {
      const choice = result.data.choices[0];
      
      if (choice.message) {
        if (choice.message.content) {
          reply = choice.message.content.trim();
        }
        
        if (choice.message.function_call) {
          functionCall = choice.message.function_call;
          console.log(`함수 호출 발생: ${functionCall.name}`, functionCall.arguments);
          
          const functionResult = JSON.parse(functionCall.arguments);
          newContext.push(
            { role: "function", name: functionCall.name, content: JSON.stringify(functionResult) },
          );

          // 함수 결과를 컨텍스트에 추가한 후 OpenAI API 다시 호출
          const followUpResponse = await openai.createChatCompletion({
            model: "gpt-4o",
            temperature: 0.1,
            messages: [
              { role: "system", content: systemPrompt },
              ...newContext
            ],
          });

          if (followUpResponse.data.choices && followUpResponse.data.choices.length > 0) {
            reply = followUpResponse.data.choices[0].message.content.trim();
          }
        }
      }
    }
      
    if (reply) {
      newContext.push({ role: "assistant", content: reply });
    } else {
      console.log("응답 내용 없음");
    }
    
    return { 
      reply, 
      context: newContext,  
      functionCall
    };
  };

  const processRequest = async (req) => {
    const { message, context } = req.body;
    const fullContext = [
      { role: "system", content: systemPrompt },
      ...context,
      { role: "user", content: message }
    ];
    
    const openaiPayload = {
      model: "gpt-4o",
      temperature: 0.1,
      messages: fullContext,
      functions: [
        {
          name: "answered",
          description: "질문에 대한 답변이 완료되었을 때 호출",
          parameters: {
            type: "object",
            properties: {
              questionNumber: {
                type: "number",
                description: "답변된 질문의 번호"
              },
              answer: {
                type: "string",
                description: "질문에 대한 답변"
              }
            },
            required: ["questionNumber", "answer"]
          }
        }
      ],
      function_call: "auto"   
    };
    
    console.log("OpenAI API 호출 직전 전체 페이로드:", JSON.stringify(openaiPayload, null, 2));
    
    return await openai.createChatCompletion(openaiPayload)
      .then(processOpenAIResponse);
  };

  if (request.method !== 'POST') {
    return response.status(405).send('Method Not Allowed');
  }

  try {
    const result = await processRequest(request);
    response.json(result);
  } catch (error) {
    console.error("오류 발생:", error);
    response.status(500).send("내부 서버 오류");
  }
});