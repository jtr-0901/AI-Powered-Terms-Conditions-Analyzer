// Content script for detecting Terms and Conditions pages
class TermsDetector {
    constructor() {
        this.init();
    }

    init() {
        // Listen for messages from popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'detectTerms') {
                const result = this.detectTermsAndConditions();
                sendResponse(result);
            }
            return true;
        });

        // Auto-detect and notify if T&C page is found
        this.autoDetect();
    }

    autoDetect() {
        const result = this.detectTermsAndConditions();
        if (result.found) {
            this.highlightImportantSections();
            this.showDetectionNotification();
        }
    }

    detectTermsAndConditions() {
        const termsKeywords = [
            'terms of service', 'terms and conditions', 'user agreement',
            'privacy policy', 'cookie policy', 'end user license',
            'service agreement', 'terms of use', 'legal agreement'
        ];

        const pageText = document.body.innerText.toLowerCase();
        const pageTitle = document.title.toLowerCase();
        const url = window.location.href.toLowerCase();

        let score = 0;
        let foundKeywords = [];

        termsKeywords.forEach(keyword => {
            const pageMatches = (pageText.match(new RegExp(keyword, 'g')) || []).length;
            const titleMatches = pageTitle.includes(keyword) ? 5 : 0; // Higher weight for title
            const urlMatches = url.includes(keyword.replace(/\s+/g, '')) ? 10 : 0; // Highest weight for URL
            
            const totalMatches = pageMatches + titleMatches + urlMatches;
            if (totalMatches > 0) {
                score += totalMatches;
                foundKeywords.push(keyword);
            }
        });

        // Additional heuristics
        const hasSubstantialContent = pageText.length > 1000;
        const hasLegalLanguage = this.checkForLegalLanguage(pageText);
        const found = score >= 3 && hasSubstantialContent && hasLegalLanguage;

        return {
            found,
            score,
            keywords: foundKeywords,
            textLength: pageText.length,
            title: document.title,
            url: window.location.href,
            content: found ? this.extractRelevantContent() : null
        };
    }

    checkForLegalLanguage(text) {
        const legalTerms = [
            'hereby', 'whereas', 'therefore', 'pursuant to', 'liability', 
            'indemnify', 'jurisdiction', 'governing law', 'breach', 
            'terminate', 'void', 'null and void', 'binding', 'enforceable'
        ];

        let legalTermCount = 0;
        legalTerms.forEach(term => {
            if (text.includes(term)) legalTermCount++;
        });

        return legalTermCount >= 3;
    }

    extractRelevantContent() {
        // Extract text content while preserving structure
        const contentElements = document.querySelectorAll('p, div, section, article');
        let relevantContent = [];

        contentElements.forEach(element => {
            const text = element.innerText.trim();
            if (text.length > 50) { // Only substantial text blocks
                relevantContent.push(text);
            }
        });

        return relevantContent.join('\n\n').substring(0, 10000); // Limit to 10k chars
    }

    highlightImportantSections() {
        const concernKeywords = {
            'data-sharing': ['share', 'third party', 'partner', 'affiliate', 'advertising'],
            'arbitration': ['arbitration', 'class action', 'lawsuit', 'legal action', 'dispute resolution'],
            'fees': ['fee', 'charge', 'payment', 'cost', 'subscription', 'renewal'],
            'privacy': ['personal information', 'data collection', 'tracking', 'cookies', 'location'],
            'cancellation': ['cancel', 'terminate', 'end', 'discontinue', 'refund']
        };

        // Create highlighting styles
        this.injectHighlightStyles();

        // Find and highlight concerning sections
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        textNodes.forEach(textNode => {
            let text = textNode.textContent;
            let hasHighlight = false;
            let highlightedText = text;

            Object.keys(concernKeywords).forEach(category => {
                concernKeywords[category].forEach(keyword => {
                    const regex = new RegExp(`(${keyword})`, 'gi');
                    if (regex.test(text)) {
                        highlightedText = highlightedText.replace(regex, `<mark class="terms-guard-highlight terms-guard-${category}" title="Potential concern: ${category}">$1</mark>`);
                        hasHighlight = true;
                    }
                });
            });

            if (hasHighlight) {
                const wrapper = document.createElement('span');
                wrapper.innerHTML = highlightedText;
                textNode.parentNode.replaceChild(wrapper, textNode);
            }
        });
    }

    injectHighlightStyles() {
        if (document.getElementById('terms-guard-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'terms-guard-styles';
        styles.innerHTML = `
            .terms-guard-highlight {
                background-color: rgba(239, 68, 68, 0.2) !important;
                border-radius: 2px !important;
                padding: 1px 2px !important;
                border: 1px solid rgba(239, 68, 68, 0.3) !important;
                cursor: help !important;
            }
            
            .terms-guard-data-sharing {
                background-color: rgba(251, 191, 36, 0.2) !important;
                border-color: rgba(251, 191, 36, 0.3) !important;
            }
            
            .terms-guard-arbitration {
                background-color: rgba(239, 68, 68, 0.3) !important;
                border-color: rgba(239, 68, 68, 0.4) !important;
            }
            
            .terms-guard-fees {
                background-color: rgba(168, 85, 247, 0.2) !important;
                border-color: rgba(168, 85, 247, 0.3) !important;
            }
            
            .terms-guard-privacy {
                background-color: rgba(59, 130, 246, 0.2) !important;
                border-color: rgba(59, 130, 246, 0.3) !important;
            }
            
            .terms-guard-cancellation {
                background-color: rgba(34, 197, 94, 0.2) !important;
                border-color: rgba(34, 197, 94, 0.3) !important;
            }
        `;
        document.head.appendChild(styles);
    }

    showDetectionNotification() {
        // Create a subtle notification that T&C has been detected
        const notification = document.createElement('div');
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
                animation: slideInFromRight 0.5s ease;
                cursor: pointer;
            " onclick="this.remove()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L3 7V10C3 16 7.5 20.8 12 22C16.5 20.8 21 16 21 10V7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Terms Guard: Document analyzed - Click extension to review
            </div>
            <style>
                @keyframes slideInFromRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
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
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new TermsDetector());
} else {
    new TermsDetector();
}