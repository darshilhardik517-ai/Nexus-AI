const DEVELOPER_NAME = "Darshil Kashyap";
const BOT_NAME = "Nexus";
let currentMode = 'chat';
let chatHistory = [];

// Get a free API key at https://console.groq.com/keys
const GROQ_API_KEY = "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";

// Get a free HF token at https://huggingface.co/settings/tokens
const HF_TOKEN = "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";

// Public CORS Proxy wrapper to allow Hugging Face image calls from GitHub Pages
const CORS_PROXY = "https://corsproxy.io/?";

const DEFAULT_WELCOME = {
    sender: 'bot',
    type: 'text',
    content: `Hello! I am ${BOT_NAME}, an AI assistant developed by ${DEVELOPER_NAME}. How can I help you today?`
};

window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('nexus_theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        document.getElementById('theme-btn').innerText = '🌙';
    }

    const saved = localStorage.getItem('nexus_chat_history');
    if (saved) {
        try { 
            chatHistory = JSON.parse(saved); 
        } catch (e) { 
            chatHistory = [DEFAULT_WELCOME]; 
        }
    } else {
        chatHistory = [DEFAULT_WELCOME];
        saveHistory();
    }
    renderHistory();
});

function toggleTheme() {
    const body = document.body;
    const themeBtn = document.getElementById('theme-btn');
    body.classList.toggle('light-theme');
    if (body.classList.contains('light-theme')) {
        themeBtn.innerText = '🌙';
        localStorage.setItem('nexus_theme', 'light');
    } else {
        themeBtn.innerText = '☀️';
        localStorage.setItem('nexus_theme', 'dark');
    }
}

function saveHistory() {
    localStorage.setItem('nexus_chat_history', JSON.stringify(chatHistory));
}

function clearHistory() {
    if (confirm("Clear your chat history?")) {
        chatHistory = [DEFAULT_WELCOME];
        saveHistory();
        renderHistory();
    }
}

function renderHistory() {
    const win = document.getElementById('chat-window');
    win.innerHTML = '';
    chatHistory.forEach(item => {
        const div = document.createElement('div');
        div.className = `msg ${item.sender}`;
        div.innerHTML = item.sender === 'user' ? escapeHtml(item.content) : item.content;
        win.appendChild(div);
    });
    win.scrollTop = win.scrollHeight;
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    
    if (mode === 'chat') {
        document.getElementById('btn-chat').classList.add('active');
        document.getElementById('user-input').placeholder = "Type a message...";
    } else {
        document.getElementById('btn-image').classList.add('active');
        document.getElementById('user-input').placeholder = "Describe the image you want generated...";
    }
}

async function send() {
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    if (!text) return;

    chatHistory.push({ sender: 'user', type: 'text', content: text });
    saveHistory();
    renderHistory();

    input.value = '';

    const win = document.getElementById('chat-window');
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'msg bot';
    loadingMsg.innerText = currentMode === 'image' ? `${BOT_NAME} is generating artwork...` : `${BOT_NAME} is thinking...`;
    win.appendChild(loadingMsg);
    win.scrollTop = win.scrollHeight;

    try {
        if (currentMode === 'chat') {
            const responseText = await fetchChatResponse(text);
            const formatted = formatResponse(responseText);
            chatHistory.push({ sender: 'bot', type: 'text', content: formatted });

        } else if (currentMode === 'image') {
            const imageUrl = await generateRealImage(text);
            const imgHtml = `
                <strong>AI Generated Image:</strong><br>
                <div class="media-box">
                    <img src="${imageUrl}" alt="${escapeHtml(text)}">
                </div>
            `;
            chatHistory.push({ sender: 'bot', type: 'image', content: imgHtml });
        }

        saveHistory();
        renderHistory();
    } catch (err) {
        loadingMsg.innerText = `Error: ${err.message}`;
    }
}

// Chat API via Groq Cloud (Free, high speed, and supports browser CORS)
async function fetchChatResponse(promptText) {
    if (!GROQ_API_KEY || GROQ_API_KEY === "YOUR_GROQ_API_KEY_HERE") {
        throw new Error("Missing GROQ_API_KEY. Please add your free key to app.js");
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: `You are ${BOT_NAME}, an AI assistant developed by ${DEVELOPER_NAME}.` },
                { role: "user", content: promptText }
            ]
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || "Failed to reach AI server.");
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// Image Generation via Hugging Face routed through CORS Proxy
async function generateRealImage(promptText) {
    if (!HF_TOKEN || HF_TOKEN === "YOUR_HUGGINGFACE_TOKEN_HERE") {
        throw new Error("Missing HF_TOKEN! Please add your key to app.js");
    }

    const targetUrl = "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell";
    const proxiedUrl = CORS_PROXY + encodeURIComponent(targetUrl);

    const response = await fetch(proxiedUrl, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${HF_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: promptText }),
    });

    if (!response.ok) {
        throw new Error("Image API request failed. Check your HF token.");
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
}

function copyCode(button) {
    const container = button.closest('.code-container');
    const codeText = container.querySelector('code').innerText;
    
    navigator.clipboard.writeText(codeText).then(() => {
        const originalText = button.innerText;
        button.innerText = 'Copied!';
        button.style.background = '#22c55e';
        button.style.color = '#ffffff';
        
        setTimeout(() => {
            button.innerText = originalText;
            button.style.background = '';
            button.style.color = '';
        }, 2000);
    });
}

function formatResponse(text) {
    let clean = escapeHtml(text);
    
    clean = clean.replace(/```(\w*)\s*([\s\S]*?)```/g, function(match, lang, code) {
        const languageLabel = lang ? lang.toUpperCase() : 'CODE';
        return `
            <div class="code-container">
                <div class="code-header">
                    <span>${languageLabel}</span>
                    <button class="copy-btn" onclick="copyCode(this)">Copy code</button>
                </div>
                <pre><code>${code.trim()}</code></pre>
            </div>
        `;
    });

    clean = clean.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    clean = clean.replace(/\*(.*?)\*/g, '<em>$1</em>');

    return clean.replace(/\n/g, '<br>');
}
