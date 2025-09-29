// Background script for the Terms Guard extension
chrome.runtime.onInstalled.addListener(() => {
    console.log('Terms Guard extension installed');
    
    // Set up initial storage
    chrome.storage.local.set({
        analyzedDocuments: [],
        settings: {
            autoDetection: true,
            highlightConcerns: true,
            notificationEnabled: true
        }
    });
});

// Handle tab updates to check for T&C pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        // Check if URL suggests terms/privacy page
        const termsUrls = [
            '/terms', '/privacy', '/legal', '/agreement', '/conditions',
            'terms-of-service', 'privacy-policy', 'user-agreement'
        ];
        
        const isTermsPage = termsUrls.some(pattern => 
            tab.url.toLowerCase().includes(pattern)
        );
        
        if (isTermsPage) {
            // Update badge to indicate T&C detected
            chrome.action.setBadgeText({
                text: '!',
                tabId: tabId
            });
            
            chrome.action.setBadgeBackgroundColor({
                color: '#3b82f6',
                tabId: tabId
            });
            
            // Store detection for analytics
            chrome.storage.local.get('analyzedDocuments', (result) => {
                const docs = result.analyzedDocuments || [];
                docs.push({
                    url: tab.url,
                    title: tab.title,
                    detectedAt: Date.now()
                });
                
                // Keep only last 50 documents
                const recentDocs = docs.slice(-50);
                chrome.storage.local.set({ analyzedDocuments: recentDocs });
            });
        } else {
            // Clear badge for non-terms pages
            chrome.action.setBadgeText({
                text: '',
                tabId: tabId
            });
        }
    }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analyzeDocument') {
        // In a real implementation, this would send to AI service
        simulateAIAnalysis(request.content)
            .then(analysis => sendResponse(analysis))
            .catch(error => sendResponse({ error: error.message }));
        return true; // Keep message channel open for async response
    }
    
    if (request.action === 'getStoredAnalysis') {
        chrome.storage.local.get('analyzedDocuments', (result) => {
            const docs = result.analyzedDocuments || [];
            const analysis = docs.find(doc => doc.url === request.url);
            sendResponse(analysis);
        });
        return true;
    }
});

// Simulate AI analysis (replace with actual AI service call)
async function simulateAIAnalysis(content) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const concerns = [];
    const contentLower = content.toLowerCase();
    
    // Check for data sharing concerns
    if (contentLower.includes('third party') || contentLower.includes('partner') || contentLower.includes('affiliate')) {
        concerns.push({
            type: 'data-sharing',
            severity: 'high',
            description: 'Document allows sharing personal data with third parties'
        });
    }
    
    // Check for arbitration clauses
    if (contentLower.includes('arbitration') || contentLower.includes('class action')) {
        concerns.push({
            type: 'arbitration',
            severity: 'high',
            description: 'Mandatory arbitration clause limits legal recourse'
        });
    }
    
    // Check for automatic renewals
    if (contentLower.includes('automatic renewal') || contentLower.includes('auto-renew')) {
        concerns.push({
            type: 'fees',
            severity: 'medium',
            description: 'Automatic subscription renewal with potential hidden fees'
        });
    }
    
    // Check for broad data collection
    if (contentLower.includes('device information') || contentLower.includes('browsing history')) {
        concerns.push({
            type: 'privacy',
            severity: 'medium',
            description: 'Extensive data collection including device and browsing data'
        });
    }
    
    // Determine overall risk level
    const highSeverityConcerns = concerns.filter(c => c.severity === 'high').length;
    const riskLevel = highSeverityConcerns >= 2 ? 'high' : 
                     highSeverityConcerns >= 1 ? 'medium' : 'low';
    
    return {
        riskLevel,
        concerns,
        summary: `Analyzed document contains ${concerns.length} potential concerns`,
        analyzedAt: Date.now()
    };
}

// Context menu for quick analysis
chrome.contextMenus.create({
    id: 'analyzeSelection',
    title: 'Analyze selected text with Terms Guard',
    contexts: ['selection']
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'analyzeSelection') {
        // Send selected text to content script for analysis
        chrome.tabs.sendMessage(tab.id, {
            action: 'analyzeSelection',
            text: info.selectionText
        });
    }
});