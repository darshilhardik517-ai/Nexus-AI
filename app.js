const DEVELOPER_NAME = "Darshil Kashyap";
const BOT_NAME = "Nexus";
let currentMode = 'chat';
let chatHistory = [];

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
            const encodedPrompt = encodeURIComponent(text);
            const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
            
            const imgHtml = `
                <strong>AI Generated Image:</strong><br>
                <div class="media-box">
                    <img src="${imageUrl}" alt="${escapeHtml(text)}" loading="lazy">
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

// Open CORS-friendly Chat API via Pollinations AI
async function fetchChatResponse(promptText) {
    const systemPrompt = `You are ${BOT_NAME}, an AI assistant developed by ${DEVELOPER_NAME}. Answer accurately and concisely.`;
    
    const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(promptText)}?system=${encodeURIComponent(systemPrompt)}`);

    if (!response.ok) {
        throw new Error("Unable to connect to AI server. Please check your internet connection.");
    }

    const text = await response.text();
    return text || `I am ${BOT_NAME}, an AI assistant developed by ${DEVELOPER_NAME}. How can I assist you further?`;
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
