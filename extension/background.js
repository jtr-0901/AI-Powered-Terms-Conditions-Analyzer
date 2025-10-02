// Simple background service worker - Phase 1 (without context menus)
console.log('Terms Guard background script started');

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Terms Guard installed');
  
  // Initialize storage
  chrome.storage.local.set({ 
    termsGuardInstalled: true,
    analyzedDocuments: [] 
  }).then(() => {
    console.log('Storage initialized');
  });
});

// Basic message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received:', request.action);
  
  if (request.action === 'analyzeContent') {
    // Simulate AI analysis
    setTimeout(() => {
      const concerns = [];
      const content = request.content?.toLowerCase() || '';
      
      // Simple content analysis
      if (content.includes('third party') || content.includes('share data')) {
        concerns.push('Third-party data sharing detected');
      }
      if (content.includes('automatic renewal') || content.includes('auto-renew')) {
        concerns.push('Automatic renewal clause found');
      }
      if (content.includes('arbitration') || content.includes('class action')) {
        concerns.push('Arbitration agreement present');
      }
      if (content.includes('location data') || content.includes('tracking')) {
        concerns.push('Location tracking enabled');
      }
      
      const riskLevel = concerns.length >= 3 ? 'high' : 
                       concerns.length >= 2 ? 'medium' : 'low';
      
      sendResponse({
        riskLevel: riskLevel,
        concerns: concerns.length > 0 ? concerns : ['No major concerns detected'],
        summary: `Found ${concerns.length} potential concern${concerns.length !== 1 ? 's' : ''}`
      });
    }, 1000);
    return true; // Keep message channel open
  }
  
  sendResponse({ status: 'ok' });
});

console.log('Background script loaded successfully');