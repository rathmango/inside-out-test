import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-functions.js';

const firebaseConfig = {
  apiKey: "AIzaSyDPil-js8r6xyVLQ7UENYI_pu4R8V6g3MQ",
  authDomain: "inside-out-test.firebaseapp.com",
  projectId: "inside-out-test",
  storageBucket: "inside-out-test.appspot.com",
  messagingSenderId: "217935526064",
  appId: "1:217935526064:web:5ef643d7d3f6ea688c2375",
  measurementId: "G-WDP6SJM3ZE"
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

document.addEventListener('DOMContentLoaded', () => {
  const chatbox = document.querySelector(".chatbox");
  const chatInput = document.querySelector(".chat-input textarea");
  const sendChatBtn = document.querySelector(".chat-input span");

  let userMessage = null;
  const inputInitHeight = chatInput.scrollHeight;
  let context = [{ role: "system", content: "You are a helpful assistant." }];

  const createChatLi = (message, className) => {
    const chatLi = document.createElement("li");
    chatLi.classList.add("chat", `${className}`);
    let chatContent = className === "outgoing" ? `<p></p>` : `<span class="material-symbols-outlined">smart_toy</span><p></p>`;
    chatLi.innerHTML = chatContent;
    chatLi.querySelector("p").textContent = message;
    return chatLi;
  }

  const generateResponse = async (chatElement) => {
    const messageElement = chatElement.querySelector("p");

    try {
      const response = await fetch('/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage, context }),
      });
      const result = await response.json();
      messageElement.textContent = result.reply;
      context = result.context;
    } catch (error) {
      messageElement.classList.add("error");
      messageElement.textContent = "오류가 발생했습니다. 다시 시도해 주세요.";
    } finally {
      chatbox.scrollTo(0, chatbox.scrollHeight);
    }
  }

  const handleChat = () => {
    userMessage = chatInput.value.trim();
    if (!userMessage) return;

    chatInput.value = "";
    chatInput.style.height = `${inputInitHeight}px`;

    chatbox.appendChild(createChatLi(userMessage, "outgoing"));
    chatbox.scrollTo(0, chatbox.scrollHeight);

    setTimeout(() => {
      const incomingChatLi = createChatLi("생각 중...", "incoming");
      chatbox.appendChild(incomingChatLi);
      chatbox.scrollTo(0, chatbox.scrollHeight);
      generateResponse(incomingChatLi);
    }, 600);
  }

  chatInput.addEventListener("input", () => {
    chatInput.style.height = `${inputInitHeight}px`;
    chatInput.style.height = `${chatInput.scrollHeight}px`;
  });

  let isComposing = false;

  chatInput.addEventListener("compositionstart", () => {
    isComposing = true;
  });

  chatInput.addEventListener("compositionend", () => {
    isComposing = false;
  });

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 800 && !isComposing) {
      e.preventDefault();
      handleChat();
    }
  });

  sendChatBtn.addEventListener("click", handleChat);
});