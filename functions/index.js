const functions = require("firebase-functions");
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: functions.config().openai.apikey,
});
const openai = new OpenAIApi(configuration);
exports.getFirebaseConfig = functions.https.onRequest((request, response) => {
    response.json(JSON.parse(functions.config().app.config));
  });
exports.processMessage = functions.https.onRequest((request, response) => {
    if (request.method !== 'POST') {
      return response.status(405).send('Method Not Allowed');
    }
  
    const { message, context } = request.body;
    
    openai.createChatCompletion({
      model: "gpt-4",
      messages: [...context, { role: "user", content: message }],
      max_tokens: 150,
    })
    .then(result => {
      const reply = result.data.choices[0].message.content.trim();
      response.status(200).send({ reply, context: [...context, { role: "user", content: message }, { role: "assistant", content: reply }] });
    })
    .catch(error => {
      console.error("OpenAI API 오류:", error);
      response.status(500).send({ error: "메시지 처리 중 오류가 발생했습니다." });
    });
});