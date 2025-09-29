class TermsGuard {
    constructor() {
        this.currentPanel = 'detection';
        this.analysisData = null;
        this.chatMessages = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkCurrentPage();
    }

    bindEvents() {
        // Panel navigation
        document.getElementById('chatBtn').addEventListener('click', () => {
            this.showPanel('chat');
        });

        document.getElementById('backBtn').addEventListener('click', () => {
            this.showPanel('analysis');
        });

        // Chat functionality
        document.getElementById('sendBtn').addEventListener('click', () => {
            this.sendMessage();
        });

        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
    }

    showPanel(panelName) {
        const panels = document.querySelectorAll('.panel');
        panels.forEach(panel => {
            panel.classList.add('hidden');
        });

        const targetPanel = document.getElementById(`${panelName}Panel`);
        if (targetPanel) {
            targetPanel.classList.remove('hidden');
            this.currentPanel = panelName;
        }
    }

    async checkCurrentPage() {
        try {
            // Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Inject content script to check for T&C
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: this.detectTermsAndConditions
            });

            const detectionResult = results[0].result;
            
            if (detectionResult.found) {
                this.handleTermsDetected(detectionResult);
            } else {
                this.handleNoTermsFound();
            }
        } catch (error) {
            console.error('Error checking page:', error);
            this.handleNoTermsFound();
        }
    }

    detectTermsAndConditions() {
        // This function runs in the content script context
        const termsKeywords = [
            'terms of service', 'terms and conditions', 'user agreement',
            'privacy policy', 'cookie policy', 'end user license',
            'service agreement', 'terms of use', 'legal agreement'
        ];

        const pageText = document.body.innerText.toLowerCase();
        const pageTitle = document.title.toLowerCase();
        const url = window.location.href.toLowerCase();

        // Check if current page contains terms
        let score = 0;
        let foundKeywords = [];

        termsKeywords.forEach(keyword => {
            if (pageText.includes(keyword) || pageTitle.includes(keyword) || url.includes(keyword.replace(/\s+/g, ''))) {
                score += pageText.split(keyword).length - 1;
                foundKeywords.push(keyword);
            }
        });

        // Heuristic: if we find keywords and the page has substantial text
        const hasSubstantialContent = pageText.length > 1000;
        const found = score >= 2 && hasSubstantialContent;

        return {
            found,
            score,
            keywords: foundKeywords,
            textLength: pageText.length,
            title: document.title,
            url: window.location.href,
            content: found ? pageText.substring(0, 5000) : null // First 5000 chars for analysis
        };
    }

    handleTermsDetected(detectionResult) {
        document.getElementById('statusText').textContent = 'Terms & Conditions Detected';
        document.getElementById('statusIndicator').querySelector('.status-dot').style.background = '#22c55e';
        
        // Simulate AI analysis (in a real implementation, this would call an AI service)
        this.analyzeTerms(detectionResult);
    }

    handleNoTermsFound() {
        document.getElementById('statusText').textContent = 'No Terms & Conditions Found';
        document.getElementById('statusIndicator').querySelector('.status-dot').style.background = '#6b7280';
        
        const content = document.getElementById('detectionContent');
        content.innerHTML = `
            <div class="detection-message">
                <div class="icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2"/>
                        <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </div>
                <p>No Terms and Conditions detected on this page. Navigate to a terms page to begin analysis.</p>
            </div>
        `;
    }

    async analyzeTerms(detectionResult) {
        // Show analysis panel
        setTimeout(() => {
            this.showPanel('analysis');
        }, 1500);

        // Simulate AI analysis with realistic concerns
        const mockAnalysis = this.generateMockAnalysis(detectionResult);
        
        // Update status
        document.getElementById('statusText').textContent = 'Analysis Complete';
        
        // Set risk level
        const riskBadge = document.getElementById('riskBadge');
        riskBadge.className = `risk-badge ${mockAnalysis.riskLevel}`;
        document.getElementById('riskLevel').textContent = mockAnalysis.riskLevel.toUpperCase();
        
        // Populate concerns
        const concernsList = document.getElementById('concernsList');
        concernsList.innerHTML = mockAnalysis.concerns.map(concern => 
            `<li>${concern}</li>`
        ).join('');

        this.analysisData = mockAnalysis;
    }

    generateMockAnalysis(detectionResult) {
        // This would be replaced with actual AI analysis
        const possibleConcerns = [
            'Broad data collection including browsing history and device information',
            'Third-party data sharing with advertising partners',
            'Mandatory arbitration clause preventing class action lawsuits',
            'Automatic subscription renewal with difficult cancellation process',
            'Location data collection even when not necessary for service',
            'Vague language around data retention periods',
            'Hidden fees for premium features not clearly disclosed',
            'Extensive permissions requested beyond core functionality',
            'Data transfer to countries with weak privacy protections',
            'Right to change terms without explicit user consent'
        ];

        // Randomly select 3-5 concerns for demo
        const selectedConcerns = possibleConcerns
            .sort(() => 0.5 - Math.random())
            .slice(0, Math.floor(Math.random() * 3) + 3);

        const riskLevels = ['low', 'medium', 'high'];
        const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)];

        return {
            riskLevel,
            concerns: selectedConcerns,
            summary: `Analysis of ${detectionResult.title} reveals ${selectedConcerns.length} potential concerns that users should be aware of.`,
            fullText: detectionResult.content
        };
    }

    async sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (!message) return;

        // Add user message
        this.addMessage('user', message);
        input.value = '';

        // Show typing indicator
        const typingId = this.addTypingIndicator();

        // Simulate AI response (in real implementation, this would call an AI service)
        setTimeout(() => {
            this.removeTypingIndicator(typingId);
            const response = this.generateAIResponse(message);
            this.addMessage('ai', response);
        }, 1500 + Math.random() * 1000);
    }

    addMessage(sender, content) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        messageDiv.textContent = content;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        this.chatMessages.push({ sender, content, timestamp: Date.now() });
    }

    addTypingIndicator() {
        const messagesContainer = document.getElementById('chatMessages');
        const typingDiv = document.createElement('div');
        const id = 'typing-' + Date.now();
        typingDiv.id = id;
        typingDiv.className = 'message typing';
        typingDiv.innerHTML = `
            AI is analyzing...
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return id;
    }

    removeTypingIndicator(id) {
        const element = document.getElementById(id);
        if (element) {
            element.remove();
        }
    }

    generateAIResponse(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        
        // Simple pattern matching for demo (real implementation would use actual AI)
        if (lowerMessage.includes('data') || lowerMessage.includes('privacy')) {
            return "Based on my analysis, this document collects personal data including your email, browsing patterns, and device information. The data may be shared with third-party advertising partners. I recommend reviewing the 'Data Collection' and 'Third-Party Sharing' sections carefully.";
        }
        
        if (lowerMessage.includes('fee') || lowerMessage.includes('cost') || lowerMessage.includes('payment')) {
            return "I found references to automatic renewal charges and potential hidden fees for premium features. The document mentions subscription fees may increase with 30 days notice. Be sure to understand the cancellation policy before agreeing.";
        }
        
        if (lowerMessage.includes('cancel') || lowerMessage.includes('subscription')) {
            return "The cancellation process requires 30 days advance notice and must be done through their customer service portal. Auto-renewal is enabled by default. I recommend setting a calendar reminder before renewal dates.";
        }
        
        if (lowerMessage.includes('arbitration') || lowerMessage.includes('lawsuit') || lowerMessage.includes('legal')) {
            return "This agreement includes a binding arbitration clause, which means you cannot participate in class action lawsuits. Disputes must be resolved through individual arbitration. This significantly limits your legal recourse options.";
        }
        
        if (lowerMessage.includes('location') || lowerMessage.includes('tracking')) {
            return "The terms allow location data collection even when the app is not in use. This data may be used for analytics and advertising. You can typically disable location services in your device settings, but some features may be limited.";
        }
        
        // Default response
        return "I've analyzed the terms and conditions for potential concerns. Could you be more specific about what aspect you'd like me to explain? I can help with data privacy, fees, cancellation policies, arbitration clauses, or any other specific sections.";
    }
}

// Initialize the extension when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TermsGuard();
});