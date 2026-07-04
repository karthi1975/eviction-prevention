// App state variables
const USER_ID = 'case-worker-default';
const APP_NAME = 'app';
let activeSessionId = null;
let isExecuting = false;
let currentBotMessageElement = null;
let currentBotText = '';
let currentBotAuthor = '';

// DOM Elements
const sessionList = document.getElementById('session-list');
const newSessionBtn = document.getElementById('new-session-btn');
const clearChatBtn = document.getElementById('clear-chat-btn');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const activeClientTitle = document.getElementById('active-client-title');
const activeSessionStatus = document.getElementById('active-session-status');
const hitlContainer = document.getElementById('hitl-container');

// Dashboard Elements
const dashClientName = document.getElementById('dash-client-name');
const dashRiskLevel = document.getElementById('dash-risk-level');
const dashRiskFactors = document.getElementById('dash-risk-factors');
const dashStabilityIndicators = document.getElementById('dash-stability-indicators');
const dashNarrative = document.getElementById('dash-narrative');

const planContainer = document.getElementById('plan-container');
const planContentSection = document.getElementById('plan-content-section');
const planLoadingState = document.getElementById('plan-loading');
const dashPlanSteps = document.getElementById('dash-plan-steps');
const dashPlanResources = document.getElementById('dash-plan-resources');
const dashPlanRaw = document.getElementById('dash-plan-raw');
const printPlanBtn = document.getElementById('print-plan-btn');
const artifactsList = document.getElementById('artifacts-list');

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  newSessionBtn.addEventListener('click', () => createNewSession());
  clearChatBtn.addEventListener('click', () => clearChatHistory());
  chatForm.addEventListener('submit', handleFormSubmit);
  printPlanBtn.addEventListener('click', printInterventionPlan);
  
  // Load saved sessions or create a new one
  loadSessions();
});

// Load sessions from localStorage
function loadSessions() {
  let savedSessions = [];
  try {
    savedSessions = JSON.parse(localStorage.getItem('preventable_sessions') || '[]');
  } catch (e) {
    savedSessions = [];
  }

  sessionList.innerHTML = '';
  
  if (savedSessions.length === 0) {
    // Create first default session
    createNewSession();
    return;
  }

  // Render all session items
  savedSessions.forEach(session => {
    renderSessionItem(session);
  });

  // Determine which session is active
  const activeSessionExists = savedSessions.some(s => s.id === activeSessionId);
  if (activeSessionExists) {
    highlightActiveSessionInUI();
  } else {
    // If active session was deleted or not found, select the first one
    const firstSession = savedSessions[0];
    selectSession(firstSession.id, firstSession.name, true);
  }
}

// Highlight the active session in the sidebar and sync the header title
function highlightActiveSessionInUI() {
  document.querySelectorAll('.session-item').forEach(el => el.classList.remove('active'));
  const activeEl = document.getElementById(`session-${activeSessionId}`);
  if (activeEl) activeEl.classList.add('active');
  
  let savedSessions = [];
  try {
    savedSessions = JSON.parse(localStorage.getItem('preventable_sessions') || '[]');
  } catch (e) {}
  const activeSession = savedSessions.find(s => s.id === activeSessionId);
  if (activeSession) {
    activeClientTitle.innerText = activeSession.name;
  }
}

// Render a session item in the sidebar
function renderSessionItem(session) {
  const li = document.createElement('li');
  li.className = `session-item ${session.id === activeSessionId ? 'active' : ''}`;
  li.id = `session-${session.id}`;
  
  li.innerHTML = `
    <div class="session-info">
      <i class="fa-solid fa-folder-open session-icon"></i>
      <span class="session-name" title="${session.name}">${session.name}</span>
    </div>
    <button class="delete-session-btn" title="Delete client record">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

  // Attach event handlers programmatically to avoid inline scoping/propagation issues
  li.addEventListener('click', () => {
    selectSession(session.id, session.name);
  });

  const deleteBtn = li.querySelector('.delete-session-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteSession(session.id);
    });
  }

  sessionList.appendChild(li);
}

// Create a new session on the backend
async function createNewSession(customName = null) {
  const tempId = 'session-' + Math.random().toString(36).substring(2, 9);
  const name = customName || `Client Record ${new Date().toLocaleDateString()}`;
  
  try {
    activeSessionStatus.innerText = 'Creating Session...';
    activeSessionStatus.className = 'status-indicator busy';
    
    const response = await fetch(`/apps/${APP_NAME}/users/${USER_ID}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: tempId,
        state: {}
      })
    });
    
    if (!response.ok) throw new Error('Failed to create session');
    
    const session = await response.json();
    const sessionId = session.id;
    
    // Save to localStorage
    const savedSessions = JSON.parse(localStorage.getItem('preventable_sessions') || '[]');
    savedSessions.unshift({ id: sessionId, name: name });
    localStorage.setItem('preventable_sessions', JSON.stringify(savedSessions));
    
    // Select and render
    activeSessionId = sessionId;
    selectSession(sessionId, name, true);
    loadSessions();
  } catch (error) {
    console.error('Error creating session:', error);
    activeSessionStatus.innerText = 'Error creating session';
    activeSessionStatus.className = 'status-indicator';
  }
}

// Delete session
function deleteSession(sessionId) {
  if (confirm('Are you sure you want to delete this client record?')) {
    // Delete from local list
    let savedSessions = [];
    try {
      savedSessions = JSON.parse(localStorage.getItem('preventable_sessions') || '[]');
    } catch (e) {
      savedSessions = [];
    }
    savedSessions = savedSessions.filter(s => s.id !== sessionId);
    localStorage.setItem('preventable_sessions', JSON.stringify(savedSessions));
    
    // Delete from backend (fire and forget, catching errors to avoid breaking UI updates)
    fetch(`/apps/${APP_NAME}/users/${USER_ID}/sessions/${sessionId}`, { method: 'DELETE' })
      .catch(err => console.warn('Failed to delete session on backend:', err));
    
    if (activeSessionId === sessionId) {
      activeSessionId = null;
    }
    
    loadSessions();
  }
}

// Select a session
async function selectSession(sessionId, name, force = false) {
  if (activeSessionId === sessionId && !force) return;
  
  activeSessionId = sessionId;
  activeClientTitle.innerText = name;
  
  // Highlight active session
  document.querySelectorAll('.session-item').forEach(el => el.classList.remove('active'));
  const activeEl = document.getElementById(`session-${sessionId}`);
  if (activeEl) activeEl.classList.add('active');
  
  // Clear chat log UI
  chatMessages.innerHTML = '';
  
  // Reset dashboard indicators
  dashClientName.innerText = '—';
  dashRiskLevel.innerText = 'PENDING';
  dashRiskLevel.className = 'risk-badge badge-neutral';
  dashRiskFactors.innerHTML = '<li class="empty-state">No risk factors identified yet. Introduce the case details to begin assessment.</li>';
  dashStabilityIndicators.innerHTML = '<li class="empty-state">No stability indicators identified yet.</li>';
  dashNarrative.innerHTML = 'Introduce case details in the chat. The Risk Profiler Agent will compile a detailed stability summary here.';
  
  planContainer.className = 'plan-empty-state';
  planContentSection.className = 'plan-content-section hidden';
  printPlanBtn.disabled = true;
  
  // Load session from backend to restore chat history
  try {
    activeSessionStatus.innerText = 'Syncing history...';
    activeSessionStatus.className = 'status-indicator busy';
    
    const response = await fetch(`/apps/${APP_NAME}/users/${USER_ID}/sessions/${sessionId}`);
    if (!response.ok) throw new Error('Session not found');
    const session = await response.json();
    
    if (session.events && session.events.length > 0) {
      // Re-populate events in UI
      session.events.forEach(evt => {
        if (evt.author === 'user' && evt.content && evt.content.parts) {
          const text = evt.content.parts.filter(p => p.text).map(p => p.text).join('');
          if (text) renderMessageBubble(text, 'user');
        } else if (evt.author && evt.author !== 'system' && evt.content && evt.content.parts) {
          const text = evt.content.parts.filter(p => p.text).map(p => p.text).join('');
          if (text) {
            renderMessageBubble(text, 'bot', evt.author);
            // Run text through risk parser to fill the dashboard
            parseRiskText(text);
          }
        }
      });
    } else {
      // Welcome message
      renderMessageBubble('Welcome back to Preventable Pathways. Please introduce your client case to begin risk assessment.', 'bot', 'coordinator');
    }
    
    activeSessionStatus.innerText = 'Ready';
    activeSessionStatus.className = 'status-indicator';
    
    // Fetch any saved artifacts
    fetchArtifacts();
  } catch (error) {
    console.error('Error syncing history:', error);
    renderMessageBubble('Welcome back. Connection to backend was interrupted, starting a new history trace.', 'bot', 'coordinator');
    activeSessionStatus.innerText = 'Ready';
    activeSessionStatus.className = 'status-indicator';
  }
}

// Clear chat history
async function clearChatHistory() {
  if (confirm('Clear chat history for this record? This will delete the session on the backend and start fresh.')) {
    const activeName = activeClientTitle.innerText;
    const oldSessionId = activeSessionId;
    
    // Delete old
    let savedSessions = JSON.parse(localStorage.getItem('preventable_sessions') || '[]');
    savedSessions = savedSessions.filter(s => s.id !== oldSessionId);
    localStorage.setItem('preventable_sessions', JSON.stringify(savedSessions));
    
    fetch(`/apps/${APP_NAME}/users/${USER_ID}/sessions/${oldSessionId}`, { method: 'DELETE' });
    
    // Create new with same name
    createNewSession(activeName);
  }
}

// Switch between dashboard tabs
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  document.getElementById(`tab-${tabId}`).classList.add('active');
  document.getElementById(`content-${tabId}`).classList.add('active');
}

// Render message bubble in chat area
function renderMessageBubble(text, sender, agentRole = '') {
  if (!text.trim()) return null;
  
  const div = document.createElement('div');
  div.className = `message ${sender}`;
  
  let avatarIcon = 'fa-user';
  let displayName = 'You';
  let agentClass = '';
  
  if (sender === 'bot') {
    avatarIcon = 'fa-robot';
    displayName = 'Coordinator';
    
    if (agentRole === 'risk_profiler') {
      avatarIcon = 'fa-magnifying-glass-chart';
      displayName = 'Risk Profiler';
      agentClass = 'risk-profiler-pill';
    } else if (agentRole === 'intervention_planner') {
      avatarIcon = 'fa-hand-holding-heart';
      displayName = 'Intervention Planner';
      agentClass = 'intervention-planner-pill';
    }
  }
  
  div.innerHTML = `
    <div class="message-avatar">
      <i class="fa-solid ${avatarIcon}"></i>
    </div>
    <div class="message-content">
      ${sender === 'bot' && agentRole ? `<span class="agent-pill ${agentClass}"><i class="fa-solid ${avatarIcon}"></i> ${displayName}</span>` : ''}
      <div class="msg-text">${formatMarkdown(text)}</div>
      <span class="message-meta">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
    </div>
  `;
  
  chatMessages.appendChild(div);
  scrollToBottom();
  return div;
}

// Robust auto-scroll to the bottom of the chat
function scrollToBottom() {
  requestAnimationFrame(() => {
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  });
}

// Formatting markdown helper (basic)
function formatMarkdown(text) {
  // Pre-process: Ensure headings (e.g., ## Heading) that are not preceded by a newline get one
  const cleanedText = text.replace(/([^\n])(#{1,6}\s)/g, '$1\n$2');
  const lines = cleanedText.split('\n');
  let result = [];
  let inList = false;
  let inOrderedList = false;
  let inTable = false;
  let tableRows = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Clean carriage returns
    line = line.replace(/\r$/, '');
    const trimmed = line.trim();

    // Check if the line is part of a table
    const isTableRow = trimmed.startsWith('|') && trimmed.endsWith('|');

    if (isTableRow) {
      if (inList) { result.push('</ul>'); inList = false; }
      if (inOrderedList) { result.push('</ol>'); inOrderedList = false; }
      inTable = true;
      tableRows.push(trimmed);
      continue;
    } else if (inTable) {
      // If we see a blank line, check if the next non-empty line is a table row.
      // If it is, skip the blank line to allow double-spaced markdown tables.
      if (trimmed === '') {
        let nextRow = '';
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim() !== '') {
            nextRow = lines[j].trim();
            break;
          }
        }
        if (nextRow.startsWith('|') && nextRow.endsWith('|')) {
          continue;
        }
      }
      
      // End of table reached
      result.push(renderHtmlTable(tableRows));
      tableRows = [];
      inTable = false;
    }

    // Convert standalone hashtag lines (like "#" or "##" with no text) to horizontal rule separators
    if (/^#+$/.test(line.trim())) {
      if (inList) { result.push('</ul>'); inList = false; }
      if (inOrderedList) { result.push('</ol>'); inOrderedList = false; }
      result.push('<hr>');
      continue;
    }

    // Headers
    if (line.startsWith('###### ')) {
      if (inList) { result.push('</ul>'); inList = false; }
      if (inOrderedList) { result.push('</ol>'); inOrderedList = false; }
      result.push(`<h6>${parseInlineMarkdown(line.substring(7))}</h6>`);
      continue;
    }
    if (line.startsWith('##### ')) {
      if (inList) { result.push('</ul>'); inList = false; }
      if (inOrderedList) { result.push('</ol>'); inOrderedList = false; }
      result.push(`<h5>${parseInlineMarkdown(line.substring(6))}</h5>`);
      continue;
    }
    if (line.startsWith('#### ')) {
      if (inList) { result.push('</ul>'); inList = false; }
      if (inOrderedList) { result.push('</ol>'); inOrderedList = false; }
      result.push(`<h4>${parseInlineMarkdown(line.substring(5))}</h4>`);
      continue;
    }
    if (line.startsWith('### ')) {
      if (inList) { result.push('</ul>'); inList = false; }
      if (inOrderedList) { result.push('</ol>'); inOrderedList = false; }
      result.push(`<h3>${parseInlineMarkdown(line.substring(4))}</h3>`);
      continue;
    }
    if (line.startsWith('## ')) {
      if (inList) { result.push('</ul>'); inList = false; }
      if (inOrderedList) { result.push('</ol>'); inOrderedList = false; }
      result.push(`<h2>${parseInlineMarkdown(line.substring(3))}</h2>`);
      continue;
    }
    if (line.startsWith('# ')) {
      if (inList) { result.push('</ul>'); inList = false; }
      if (inOrderedList) { result.push('</ol>'); inOrderedList = false; }
      result.push(`<h1>${parseInlineMarkdown(line.substring(2))}</h1>`);
      continue;
    }

    // Blockquotes
    if (line.startsWith('> ')) {
      if (inList) { result.push('</ul>'); inList = false; }
      if (inOrderedList) { result.push('</ol>'); inOrderedList = false; }
      result.push(`<blockquote>${parseInlineMarkdown(line.substring(2))}</blockquote>`);
      continue;
    }

    // Lists
    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (inOrderedList) { result.push('</ol>'); inOrderedList = false; }
      if (!inList) {
        result.push('<ul>');
        inList = true;
      }
      result.push(`<li>${parseInlineMarkdown(line.substring(2))}</li>`);
      continue;
    }

    // Numbered lists (1. 2. etc.)
    if (/^\d+\.\s/.test(line)) {
      if (inList) { result.push('</ul>'); inList = false; }
      if (!inOrderedList) {
        result.push('<ol>');
        inOrderedList = true;
      }
      const match = line.match(/^\d+\.\s/);
      result.push(`<li>${parseInlineMarkdown(line.substring(match[0].length))}</li>`);
      continue;
    }

    // Empty lines
    if (line.trim() === '') {
      if (inList) { result.push('</ul>'); inList = false; }
      if (inOrderedList) { result.push('</ol>'); inOrderedList = false; }
      continue;
    }

    // Normal text lines
    if (inList) { result.push('</ul>'); inList = false; }
    if (inOrderedList) { result.push('</ol>'); inOrderedList = false; }
    result.push(`<p>${parseInlineMarkdown(line)}</p>`);
  }

  if (inTable && tableRows.length > 0) {
    result.push(renderHtmlTable(tableRows));
  }

  if (inList) result.push('</ul>');
  if (inOrderedList) result.push('</ol>');

  return result.join('\n');
}

function renderHtmlTable(rows) {
  let html = '<table class="msg-table">';
  let hasHeader = false;
  let inBody = false;

  rows.forEach(row => {
    const cells = row.split('|')
      .map(c => c.trim())
      .filter((c, i, arr) => i > 0 && i < arr.length - 1);

    if (cells.length === 0) return;
    if (cells.every(c => /^[:\s-]+$/.test(c))) return; // Skip separator lines

    if (!hasHeader) {
      html += '<thead><tr>' + cells.map(c => `<th>${parseInlineMarkdown(c)}</th>`).join('') + '</tr></thead>';
      hasHeader = true;
    } else {
      if (!inBody) {
        html += '<tbody>';
        inBody = true;
      }
      html += '<tr>' + cells.map(c => `<td>${parseInlineMarkdown(c)}</td>`).join('') + '</tr>';
    }
  });

  if (inBody) {
    html += '</tbody>';
  }
  html += '</table>';
  return html;
}

function parseInlineMarkdown(text) {
  let html = text;
  // Bold: **text** or __text__
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  // Italic: *text* or _text_
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  // Code: `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  return html;
}

// Form Submission (Sending user prompt)
async function handleFormSubmit(e) {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text || isExecuting) return;
  
  chatInput.value = '';
  chatInput.focus();
  
  // Render user message bubble
  renderMessageBubble(text, 'user');
  
  // Execute agent call
  executeAgentRun({
    role: 'user',
    parts: [{ text: text }]
  });
}

// Stream call to backend
async function executeAgentRun(newMessagePayload) {
  if (isExecuting) return;
  
  isExecuting = true;
  chatInput.disabled = true;
  sendBtn.disabled = true;
  activeSessionStatus.innerText = 'Agent is thinking...';
  activeSessionStatus.className = 'status-indicator busy';
  
  // Prepare dynamic loading message bubble for Bot
  currentBotText = '';
  currentBotAuthor = 'coordinator';
  currentBotMessageElement = null;
  
  try {
    const data = {
      app_name: APP_NAME,
      user_id: USER_ID,
      session_id: activeSessionId,
      new_message: newMessagePayload,
      streaming: true
    };
    
    const response = await fetch('/run_sse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) throw new Error('Agent run failed');
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep partial line in buffer
      
      for (const line of lines) {
        if (line.trim().startsWith('data: ')) {
          const rawJson = line.trim().substring(6);
          try {
            const event = JSON.parse(rawJson);
            handleAgentEvent(event);
          } catch (err) {
            console.error('Error parsing SSE json:', err, rawJson);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in agent execution:', error);
    renderMessageBubble('Sorry, I encountered an error communicating with the agent. Please try again.', 'bot', 'coordinator');
  } finally {
    isExecuting = false;
    chatInput.disabled = false;
    sendBtn.disabled = false;
    activeSessionStatus.innerText = 'Ready';
    activeSessionStatus.className = 'status-indicator';
    
    // Automatically poll artifacts on completion
    fetchArtifacts();
  }
}

// Handle dynamic SSE events from the agent runner
function handleAgentEvent(event) {
  // 1. Check for interactive confirmations (HITL)
  if (event.content && event.content.parts) {
    const confirmationPart = event.content.parts.find(p => {
      const fc = p.functionCall || p.function_call;
      return fc && fc.name === 'adk_request_confirmation';
    });
    if (confirmationPart) {
      const fc = confirmationPart.functionCall || confirmationPart.function_call;
      renderHITLConfirmation(fc);
      return;
    }
    
    const inputPart = event.content.parts.find(p => {
      const fc = p.functionCall || p.function_call;
      return fc && fc.name === 'adk_request_input';
    });
    if (inputPart) {
      const fc = inputPart.functionCall || inputPart.function_call;
      renderHITLInput(fc);
      return;
    }
  }
  
  // 2. Handle Text Response Stream
  if (event.content && event.content.parts) {
    const textPart = event.content.parts.find(p => p.text);
    if (textPart) {
      const author = event.author || 'coordinator';
      
      if (!currentBotMessageElement || currentBotAuthor !== author) {
        // Create new bubble if author changed or we don't have one
        currentBotText = textPart.text;
        currentBotAuthor = author;
        currentBotMessageElement = renderMessageBubble(currentBotText, 'bot', author);
      } else {
        // Append text to existing active bubble
        currentBotText += textPart.text;
        const textContainer = currentBotMessageElement.querySelector('.msg-text');
        if (textContainer) {
          textContainer.innerHTML = formatMarkdown(currentBotText);
        }
      }
      
      // Parse information into the dashboard dynamically
      parseRiskText(currentBotText);
      scrollToBottom();
    }
  }
}

// Parse risk factors, client name, risk level and narrative summary from chat text
function parseRiskText(text) {
  // Extract Client Name
  const nameMatch = text.match(/Client\s+Name:\s*\**([^\n\*]+)/i);
  if (nameMatch && nameMatch[1]) {
    const name = nameMatch[1].trim();
    dashClientName.innerText = name;
    
    // Update local storage session name if it has been updated from "Client Record..."
    const savedSessions = JSON.parse(localStorage.getItem('preventable_sessions') || '[]');
    const currentSession = savedSessions.find(s => s.id === activeSessionId);
    if (currentSession && currentSession.name.startsWith('Client Record')) {
      currentSession.name = `Client: ${name}`;
      localStorage.setItem('preventable_sessions', JSON.stringify(savedSessions));
      activeClientTitle.innerText = `Client: ${name}`;
      
      // Update sidebar element text
      const sidebarNameEl = document.querySelector(`#session-${activeSessionId} .session-name`);
      if (sidebarNameEl) sidebarNameEl.innerText = `Client: ${name}`;
    }
  }
  
  // Extract Risk Level
  const riskMatch = text.match(/(?:Eviction\s+)?Risk\s+Level:\s*\**(\w+)\**/i);
  if (riskMatch && riskMatch[1]) {
    const risk = riskMatch[1].trim().toUpperCase();
    dashRiskLevel.innerText = risk;
    
    if (risk.includes('LOW')) {
      dashRiskLevel.className = 'risk-badge badge-low';
    } else if (risk.includes('MEDIUM')) {
      dashRiskLevel.className = 'risk-badge badge-medium';
    } else if (risk.includes('HIGH')) {
      dashRiskLevel.className = 'risk-badge badge-high';
    } else {
      dashRiskLevel.className = 'risk-badge badge-neutral';
    }
  }
  
  // Extract Risk Factors (table or list)
  const riskFactorsSection = extractSection(text, 'Risk Factors');
  if (riskFactorsSection) {
    const contentHtml = renderSectionContent(riskFactorsSection, 'risk');
    if (contentHtml) {
      dashRiskFactors.innerHTML = contentHtml;
    }
  }
  
  // Extract Stability Indicators (table or list)
  const stabilitySection = extractSection(text, 'Stability Indicators') || extractSection(text, 'Protective Factors');
  if (stabilitySection) {
    const contentHtml = renderSectionContent(stabilitySection, 'stability');
    if (contentHtml) {
      dashStabilityIndicators.innerHTML = contentHtml;
    }
  }
  
  // Extract Narrative Summary
  const narrativeSection = extractSection(text, 'Narrative Summary');
  if (narrativeSection) {
    dashNarrative.innerText = narrativeSection.trim();
  }
}

// Helpers for parsing sections of text
function extractSection(text, sectionName) {
  // Match headings, e.g. "### Risk Factors", "## Risk Factors", "Risk Factors:"
  // Allow optional hashes, spaces, asterisks and colons
  const regex = new RegExp('(?:^|\\n)[#\\s\\*_-]*' + sectionName + '[#\\s\\*_-]*:?\\s*\\n', 'i');
  const match = text.match(regex);
  if (!match) return null;
  
  const startIndex = match.index + match[0].length;
  const sub = text.substring(startIndex);
  
  // Find next section header
  const nextHeaderIndex = sub.search(/\n[#\s\*_-]*(?:Stability|Narrative|Risk|Action|Recommended|Client|Eviction|Complete|Saved)[#\s\*_-]*:?\s*\n/i);
  if (nextHeaderIndex !== -1) {
    return sub.substring(0, nextHeaderIndex);
  }
  return sub;
}

// Helper to render section content (Markdown table or list)
function renderSectionContent(sectionText, type) {
  if (!sectionText) return '';
  const cleanText = sectionText.trim();
  if (!cleanText) return '';

  // Check if it's a markdown table
  if (cleanText.includes('|') && cleanText.split('\n').length > 1) {
    const lines = cleanText.split('\n');
    let html = '<table class="dash-table">';
    let hasHeader = false;
    let inBody = false;

    lines.forEach(line => {
      const trimmed = line.trim();
      // Skip empty lines or separator line e.g. |:---|:---|
      if (!trimmed || /^\|[\s:-|]+$/.test(trimmed)) return;
      
      const cells = trimmed.split('|')
        .map(c => c.trim())
        .filter((c, i, arr) => i > 0 && i < arr.length - 1); // remove outer empty elements from splitting | cell | cell |

      if (cells.length === 0) return;

      if (!hasHeader) {
        html += '<thead><tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr></thead>';
        hasHeader = true;
      } else {
        if (!inBody) {
          html += '<tbody>';
          inBody = true;
        }
        
        // Format cells containing severity/status as styled badges
        const formattedCells = cells.map(c => {
          const lower = c.toLowerCase();
          if (lower === 'severe' || lower === 'high' || lower.includes('imminent')) {
            return `<td><span class="badge-cell severe">${c}</span></td>`;
          } else if (lower === 'medium' || lower.includes('moderate') || lower.includes('medium-high')) {
            return `<td><span class="badge-cell medium">${c}</span></td>`;
          } else if (lower === 'low' || lower === 'success' || lower === 'current') {
            return `<td><span class="badge-cell low">${c}</span></td>`;
          }
          return `<td>${c}</td>`;
        });
        
        html += '<tr>' + formattedCells.join('') + '</tr>';
      }
    });

    if (inBody) {
      html += '</tbody>';
    }
    html += '</table>';
    return html;
  }

  // Fallback: render as list
  const lines = cleanText.split('\n');
  const items = [];
  lines.forEach(line => {
    const cleanLine = line.trim().replace(/^[-*•\d\.\s]+/, '');
    if (cleanLine.length > 2) {
      items.push(cleanLine);
    }
  });

  const listClass = type === 'risk' ? 'factor-list' : 'factor-list success-list';
  const icon = type === 'risk' ? 'fa-triangle-exclamation' : 'fa-circle-check';

  if (items.length > 0) {
    return `<ul class="${listClass}">` + 
      items.map(item => `<li><i class="fa-solid ${icon}"></i> ${item}</li>`).join('') + 
      '</ul>';
  }

  return `<ul class="${listClass}"><li class="empty-state">${cleanText}</li></ul>`;
}

// Render Vibe Diff Confirmation Interactive Modal
function renderHITLConfirmation(functionCall) {
  const args = functionCall.args || {};
  const toolConfirmation = args.toolConfirmation || args.tool_confirmation || {};
  const hint = toolConfirmation.hint || 'Please confirm execution of this action.';
  
  hitlContainer.innerHTML = `
    <div class="hitl-card">
      <div class="hitl-header">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <h3>Security Gate: Action Authorization</h3>
      </div>
      <div class="hitl-body">
        <p>A high-stakes database event is pending confirmation. The Intervention Planner is proposing to write this action plan to the client file:</p>
        <div class="hitl-hint-box">${hint}</div>
      </div>
      <div class="hitl-footer">
        <button id="hitl-reject-btn" class="btn btn-secondary"><i class="fa-solid fa-ban"></i> Reject Action</button>
        <button id="hitl-approve-btn" class="btn btn-success"><i class="fa-solid fa-shield-check"></i> Approve & Save Plan</button>
      </div>
    </div>
  `;
  
  hitlContainer.classList.remove('hidden');
  
  document.getElementById('hitl-reject-btn').onclick = () => submitHITLResponse(functionCall.id, functionCall.name, { confirmed: false });
  document.getElementById('hitl-approve-btn').onclick = () => submitHITLResponse(functionCall.id, functionCall.name, { confirmed: true });
}

// Render Interactive text input card for human-in-the-loop
function renderHITLInput(functionCall) {
  const args = functionCall.args || {};
  const message = args.message || 'Input requested by agent';
  
  hitlContainer.innerHTML = `
    <div class="hitl-card">
      <div class="hitl-header">
        <i class="fa-solid fa-circle-question" style="color: var(--accent-color);"></i>
        <h3>Information Required</h3>
      </div>
      <div class="hitl-body">
        <p>${message}</p>
        <div class="hitl-input-box">
          <label for="hitl-text-input">Your Response</label>
          <input type="text" id="hitl-text-input" placeholder="Type here..." required>
        </div>
      </div>
      <div class="hitl-footer">
        <button id="hitl-input-submit-btn" class="btn btn-primary">Submit Response</button>
      </div>
    </div>
  `;
  
  hitlContainer.classList.remove('hidden');
  
  const submitBtn = document.getElementById('hitl-input-submit-btn');
  const textInput = document.getElementById('hitl-text-input');
  
  textInput.focus();
  
  const submit = () => {
    const val = textInput.value.trim();
    if (val) submitHITLResponse(functionCall.id, functionCall.name, { result: val });
  };
  
  submitBtn.onclick = submit;
  textInput.onkeydown = (e) => {
    if (e.key === 'Enter') submit();
  };
}

// Send HITL response back to the execution stream
async function submitHITLResponse(fcId, fcName, responseData) {
  hitlContainer.classList.add('hidden');
  
  // Format standard FunctionResponse wrapper for Vertex AI
  const functionResponsePayload = {
    role: 'user',
    parts: [{
      functionResponse: {
        id: fcId,
        name: fcName,
        response: responseData
      }
    }]
  };
  
  // Echo confirmation bubble in chat
  if (fcName === 'adk_request_confirmation') {
    const text = responseData.confirmed ? 'Authorized and Approved save action.' : 'Rejected save action.';
    renderMessageBubble(text, 'user');
  } else if (responseData.result) {
    renderMessageBubble(responseData.result, 'user');
  }
  
  // Resume agent run with the function response payload
  executeAgentRun(functionResponsePayload);
}

// Fetch session artifacts
async function fetchArtifacts() {
  if (!activeSessionId) return;
  
  try {
    const response = await fetch(`/apps/${APP_NAME}/users/${USER_ID}/sessions/${activeSessionId}/artifacts`);
    if (!response.ok) return;
    
    const keys = await response.json();
    artifactsList.innerHTML = '';
    
    if (keys && keys.length > 0) {
      const txtFiles = keys.filter(k => k.endsWith('.txt'));
      
      if (txtFiles.length === 0) {
        artifactsList.innerHTML = '<li class="empty-state">No saved plans yet.</li>';
        return;
      }
      
      txtFiles.forEach(file => {
        const li = document.createElement('li');
        li.className = 'artifact-item';
        li.onclick = () => loadInterventionPlanDocument(file);
        li.innerHTML = `
          <i class="fa-solid fa-file-invoice"></i>
          <span class="artifact-name">${file}</span>
        `;
        artifactsList.appendChild(li);
      });
      
      // Auto-load the first text artifact (which contains the intervention plan)
      loadInterventionPlanDocument(txtFiles[0]);
    } else {
      artifactsList.innerHTML = '<li class="empty-state">No saved plans yet.</li>';
    }
  } catch (err) {
    console.error('Error fetching artifacts:', err);
  }
}

// Load intervention plan from file and display it
async function loadInterventionPlanDocument(filename) {
  if (!activeSessionId) return;
  
  planLoadingState.classList.remove('hidden');
  planContainer.classList.add('hidden');
  planContentSection.classList.add('hidden');
  
  try {
    const response = await fetch(`/apps/${APP_NAME}/users/${USER_ID}/sessions/${activeSessionId}/artifacts/${filename}`);
    if (!response.ok) throw new Error('Failed to load artifact');
    
    const part = await response.json();
    
    // The response is a types.Part. If it has inline_data, decode it.
    let planText = '';
    if (part.text) {
      planText = part.text;
    } else if (part.inlineData && part.inlineData.data) {
      // Decode base64
      planText = atob(part.inlineData.data);
    } else if (part.inline_data && part.inline_data.data) {
      planText = atob(part.inline_data.data);
    }
    
    if (!planText) throw new Error('Empty plan text');
    
    // Show sections
    dashPlanRaw.innerText = planText;
    
    // Parse plan sections
    parseInterventionPlan(planText);
    
    planLoadingState.classList.add('hidden');
    planContentSection.classList.remove('hidden');
    printPlanBtn.disabled = false;
    
    // Switch to action plan tab automatically so user can see it!
    switchTab('plan');
  } catch (err) {
    console.error('Error loading plan document:', err);
    planLoadingState.classList.add('hidden');
    planContainer.classList.remove('hidden');
  }
}

// Parse intervention plan txt file into nice grid cards
function parseInterventionPlan(text) {
  dashPlanSteps.innerHTML = '';
  dashPlanResources.innerHTML = '';
  
  // Extract steps (lines starting with numbers or list indicators)
  const stepsIndex = text.toLowerCase().indexOf('steps');
  const resourcesIndex = text.toLowerCase().indexOf('resources');
  
  // Extract Steps Segment
  if (stepsIndex !== -1) {
    const stepsText = text.substring(stepsIndex, resourcesIndex !== -1 ? resourcesIndex : text.length);
    const steps = parseListItems(stepsText);
    
    if (steps.length > 0) {
      dashPlanSteps.innerHTML = steps.map((step, idx) => `
        <div class="plan-step-item">
          <div class="step-num">${idx + 1}</div>
          <div class="step-text">${step}</div>
        </div>
      `).join('');
    } else {
      dashPlanSteps.innerHTML = '<p class="empty-state">No structured steps found. Check the complete document below.</p>';
    }
  } else {
    dashPlanSteps.innerHTML = '<p class="empty-state">No steps section found. Check complete document.</p>';
  }
  
  // Extract Resources Segment (and match with our registry descriptions if available)
  if (resourcesIndex !== -1) {
    const resourcesText = text.substring(resourcesIndex);
    const resources = parseListItems(resourcesText);
    
    if (resources.length > 0) {
      // Look for resource cards
      dashPlanResources.innerHTML = resources.map(res => {
        // Try to separate name and details
        let name = res;
        let details = '';
        let contact = '';
        
        const splitIdx = res.indexOf('-');
        const contactSplitIdx = res.indexOf('Phone:');
        
        if (splitIdx !== -1) {
          name = res.substring(0, splitIdx).trim();
          details = res.substring(splitIdx + 1).trim();
        }
        
        if (contactSplitIdx !== -1) {
          const mainPart = res.substring(0, contactSplitIdx);
          contact = res.substring(contactSplitIdx).trim();
          
          const innerSplit = mainPart.indexOf('-');
          if (innerSplit !== -1) {
            name = mainPart.substring(0, innerSplit).trim();
            details = mainPart.substring(innerSplit + 1).trim();
          } else {
            name = mainPart.trim();
          }
        }
        
        // Remove trailing or leading brackets
        name = name.replace(/^[\s\*\-\d\.\:]+/, '').replace(/\*+$/, '').trim();
        
        return `
          <div class="resource-card">
            <h4>${name}</h4>
            ${details ? `<p>${details}</p>` : '<p>Emergency eviction prevention and stability support services.</p>'}
            ${contact ? `<div class="resource-contact"><i class="fa-solid fa-address-book"></i> ${contact}</div>` : ''}
          </div>
        `;
      }).join('');
    } else {
      dashPlanResources.innerHTML = '<p class="empty-state">No structured resources listed. Check complete document.</p>';
    }
  } else {
    dashPlanResources.innerHTML = '<p class="empty-state">No resources section found. Check complete document.</p>';
  }
}

// Print the Action Plan
function printInterventionPlan() {
  const content = dashPlanRaw.innerText;
  const clientName = dashClientName.innerText;
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>Intervention Plan: ${clientName}</title>
        <style>
          body { font-family: sans-serif; padding: 40px; line-height: 1.6; color: #333; }
          h1 { border-bottom: 2px solid #333; padding-bottom: 10px; font-size: 24px; }
          pre { white-space: pre-wrap; font-family: monospace; font-size: 14px; background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 4px; }
          .footer { margin-top: 40px; font-size: 12px; color: #777; border-top: 1px solid #ddd; padding-top: 10px; text-align: center; }
        </style>
      </head>
      <body>
        <h1>Preventable Pathways Eviction Intervention Action Plan</h1>
        <p><strong>Client Name:</strong> ${clientName}</p>
        <p><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</p>
        <pre>${content}</pre>
        <div class="footer">Generated via Preventable Pathways Eviction Prevention Portal. Scoped to Case Session: ${activeSessionId}</div>
      </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
