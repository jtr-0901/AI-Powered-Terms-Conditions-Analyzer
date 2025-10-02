class TermsGuard {
  constructor() {
    this.currentPanel = 'detection';
    this.init();
  }

  async init() {
    this.bindEvents();
    await this.analyzeCurrentPage();
  }

  bindEvents() {
    // Navigation
    document.getElementById('chatBtn')?.addEventListener('click', () => this.showPanel('chat'));
    document.getElementById('backBtn')?.addEventListener('click', () => this.showPanel('analysis'));
    
    // Chat
    document.getElementById('sendBtn')?.addEventListener('click', () => this.sendMessage());
    document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
  }

  showPanel(panelName) {
    // Hide all panels
    document.querySelectorAll('.panel').forEach(panel => {
      panel.classList.add('hidden');
    });
    
    // Show target panel
    const targetPanel = document.getElementById(panelName + 'Panel');
    if (targetPanel) {
      targetPanel.classList.remove('hidden');
      this.currentPanel = panelName;
    }
  }

  async analyzeCurrentPage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Try to get detection from content script
      const detection = await this.detectTermsInContentScript(tab.id);
      
      if (detection?.found) {
        this.showTermsDetected(detection);
        await this.startAnalysis(detection);
      } else {
        this.showNoTerms();
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      this.showNoTerms();
    }
  }

  async detectTermsInContentScript(tabId) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { action: 'detectTerms' }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Content script not available, using fallback');
          resolve(this.fallbackDetection());
        } else {
          resolve(response);
        }
      });
    });
  }

  fallbackDetection() {
    // This would need to be implemented with chrome.scripting.executeScript
    // For now, return a mock result
    return {
      found: false,
      keywords: [],
      error: 'Content script not available'
    };
  }

  showTermsDetected(detection) {
    document.getElementById('statusText').textContent = 'Terms Detected';
    document.querySelector('.status-dot').style.background = '#22c55e';
    
    const content = document.getElementById('detectionContent');
    content.innerHTML = `
      <div class="detection-message">
        <div class="icon">✓</div>
        <p>Legal document detected! Analyzing...</p>
        <div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">
          Found: ${detection.keywords.join(', ')}
        </div>
      </div>
    `;
  }

  showNoTerms() {
    document.getElementById('statusText').textContent = 'No Terms Found';
    document.querySelector('.status-dot').style.background = '#6b7280';
    
    const content = document.getElementById('detectionContent');
    content.innerHTML = `
      <div class="detection-message">
        <div class="icon">ℹ</div>
        <p>No terms document detected on this page.</p>
      </div>
    `;
  }

  async startAnalysis(detection) {
    // Show analyzing state
    document.getElementById('statusText').textContent = 'Analyzing...';
    
    // Simulate AI analysis
    setTimeout(async () => {
      const analysis = await this.performAnalysis(detection);
      this.showAnalysisResults(analysis);
      this.showPanel('analysis');
    }, 2000);
  }

  async performAnalysis(detection) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'analyzeContent',
        content: detection.content,
        url: detection.url
      }, (response) => {
        resolve(response);
      });
    });
  }

  showAnalysisResults(analysis) {
    document.getElementById('statusText').textContent = 'Analysis Complete';
    
    // Update risk badge
    const riskBadge = document.getElementById('riskBadge');
    riskBadge.className = `risk-badge ${analysis.riskLevel}`;
    document.getElementById('riskLevel').textContent = analysis.riskLevel.toUpperCase();
    
    // Update concerns list
    const concernsList = document.getElementById('concernsList');
    if (analysis.concerns && analysis.concerns.length > 0) {
      concernsList.innerHTML = analysis.concerns.map(concern => 
        `<li>${concern}</li>`
      ).join('');
    } else {
      concernsList.innerHTML = '<li>No major concerns detected</li>';
    }
  }

  sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;

    this.addMessage('user', message);
    input.value = '';

    // Show typing indicator
    const typingId = this.showTypingIndicator();

    // Simulate AI response
    setTimeout(() => {
      this.hideTypingIndicator(typingId);
      const response = this.generateResponse(message);
      this.addMessage('ai', response);
    }, 1500);
  }

  addMessage(sender, text) {
    const container = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.textContent = text;
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
  }

  showTypingIndicator() {
    const container = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'message typing';
    typingDiv.textContent = 'AI is typing...';
    container.appendChild(typingDiv);
    container.scrollTop = container.scrollHeight;
    return 'typing-indicator';
  }

  hideTypingIndicator(id) {
    const element = document.getElementById(id);
    if (element) element.remove();
  }

  generateResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('privacy') || lowerMessage.includes('data')) {
      return "I found several data collection clauses in the terms. The document allows collection of personal information and may share it with third parties for advertising purposes.";
    }
    
    if (lowerMessage.includes('fee') || lowerMessage.includes('payment')) {
      return "The terms mention subscription fees and automatic renewals. There's a 30-day cancellation notice requirement.";
    }
    
    if (lowerMessage.includes('cancel') || lowerMessage.includes('terminate')) {
      return "Cancellation requires written notice 30 days in advance. Auto-renewal is enabled by default.";
    }
    
    return "I've analyzed this document for common concerns. You can ask me about privacy, fees, cancellation, or any specific clauses you're concerned about.";
  }
}

// Initialize when ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new TermsGuard());
} else {
  new TermsGuard();
}