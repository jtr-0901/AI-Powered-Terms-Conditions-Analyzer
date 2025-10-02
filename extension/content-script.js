// Content script for Terms Guard extension
console.log('Terms Guard content script loaded');

class TermsDetector {
    constructor() {
        this.isInitialized = false;
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        console.log('Initializing Terms Detector...');

        // Set up message listener first
        this.setupMessageListener();
        
        // Then run auto-detection
        this.safeAutoDetect();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('Content script received message:', request.action);
            
            if (request.action === 'detectTerms') {
                try {
                    const result = this.detectTermsAndConditions();
                    console.log('Detection completed, found:', result.found);
                    sendResponse(result);
                } catch (error) {
                    console.error('Detection error:', error);
                    sendResponse({ 
                        found: false, 
                        error: error.message,
                        keywords: [],
                        textLength: 0
                    });
                }
                return true; // Keep message channel open
            }
            
            if (request.action === 'ping') {
                sendResponse({ status: 'alive', ready: true });
                return true;
            }
            
            return true;
        });
        
        console.log('Message listener setup complete');
    }

    safeAutoDetect() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.performAutoDetect(), 1000);
            });
        } else {
            setTimeout(() => this.performAutoDetect(), 500);
        }
    }

    performAutoDetect() {
        try {
            const result = this.detectTermsAndConditions();
            console.log('Auto-detection result:', result.found, 'score:', result.score);
            
            if (result.found) {
                this.showDetectionNotification();
                // Don't highlight automatically to avoid interfering with page
            }
        } catch (error) {
            console.error('Auto-detection failed:', error);
        }
    }

    detectTermsAndConditions() {
        const termsKeywords = [
            'terms of service', 'terms and conditions', 'terms of use', 
            'privacy policy', 'user agreement', 'legal agreement',
            'service agreement', 'terms & conditions', 'privacy notice',
            'cookie policy', 'eula', 'disclaimer', 'legal notice'
        ];

        const pageText = document.body.innerText.toLowerCase();
        const pageTitle = document.title.toLowerCase();
        const url = window.location.href.toLowerCase();

        let score = 0;
        let foundKeywords = [];

        // Check URL first (most reliable indicator)
        termsKeywords.forEach(keyword => {
            const urlKeyword = keyword.replace(/\s+/g, '-');
            if (url.includes(urlKeyword)) {
                score += 20;
                foundKeywords.push(keyword + ' (URL)');
            }
        });

        // Check page title
        termsKeywords.forEach(keyword => {
            if (pageTitle.includes(keyword)) {
                score += 15;
                foundKeywords.push(keyword + ' (title)');
            }
        });

        // Check page content
        termsKeywords.forEach(keyword => {
            const matches = (pageText.match(new RegExp(keyword, 'gi')) || []).length;
            if (matches > 0) {
                score += Math.min(matches, 5);
                foundKeywords.push(keyword + ` (${matches} matches)`);
            }
        });

        // Check for legal language
        const legalTerms = ['hereby', 'agreement', 'jurisdiction', 'liability', 'indemnify'];
        let legalTermCount = 0;
        legalTerms.forEach(term => {
            if (pageText.includes(term)) legalTermCount++;
        });

        if (legalTermCount >= 3) {
            score += 10;
        }

        const hasSubstantialContent = pageText.length > 1000;
        const found = score >= 10 && hasSubstantialContent;

        return {
            found,
            score,
            keywords: foundKeywords,
            textLength: pageText.length,
            title: document.title,
            url: window.location.href,
            content: found ? this.extractContent() : null
        };
    }

    extractContent() {
        try {
            // Try to get content from common containers
            const selectors = [
                'main', 'article', '[role="main"]',
                '[class*="content"]', '[class*="terms"]', '[class*="privacy"]',
                '[class*="legal"]', '[class*="agreement"]'
            ];

            let content = '';
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    elements.forEach(el => {
                        content += ' ' + el.innerText;
                    });
                    break;
                }
            }

            // Fallback to body if no specific container found
            if (!content.trim()) {
                content = document.body.innerText;
            }

            return content.substring(0, 15000); // Limit content size
        } catch (error) {
            console.error('Content extraction error:', error);
            return document.body.innerText.substring(0, 10000);
        }
    }

    showDetectionNotification() {
        if (document.getElementById('terms-guard-notification')) return;

        try {
            const notification = document.createElement('div');
            notification.id = 'terms-guard-notification';
            notification.innerHTML = `
                <div style="
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #3b82f6, #2563eb);
                    color: white;
                    padding: 12px 16px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                    z-index: 10000;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    max-width: 300px;
                    animation: slideInFromRight 0.5s ease;
                ">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L3 7V10C3 16 7.5 20.8 12 22C16.5 20.8 21 16 21 10V7L12 2Z"/>
                        <path d="M9 12L11 14L15 10"/>
                    </svg>
                    <span>Terms detected! Click extension to analyze</span>
                </div>
                <style>
                    @keyframes slideInFromRight {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                </style>
            `;
            
            document.body.appendChild(notification);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 5000);

            // Click to remove
            notification.addEventListener('click', () => {
                notification.remove();
            });
        } catch (error) {
            console.error('Notification error:', error);
        }
    }
}

// Initialize with retry logic
function initializeContentScript() {
    try {
        // Wait a bit for page to stabilize
        setTimeout(() => {
            try {
                new TermsDetector();
                console.log('Terms Guard content script initialized successfully');
            } catch (error) {
                console.error('Content script initialization failed:', error);
            }
        }, 100);
    } catch (error) {
        console.error('Content script setup failed:', error);
    }
}

// Start initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
    initializeContentScript();
}