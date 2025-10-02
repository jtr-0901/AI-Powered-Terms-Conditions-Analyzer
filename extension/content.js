// Content script - Terms detection
console.log('Terms Guard content script loaded');

// Simple terms detection
function detectTerms() {
  const text = document.body.innerText.toLowerCase();
  const url = window.location.href.toLowerCase();
  const title = document.title.toLowerCase();
  
  const termsPatterns = [
    'terms of service',
    'terms and conditions', 
    'privacy policy',
    'user agreement',
    'legal agreement',
    'terms of use'
  ];
  
  let found = false;
  let keywords = [];
  
  termsPatterns.forEach(pattern => {
    if (text.includes(pattern) || title.includes(pattern) || url.includes(pattern.replace(/\s+/g, '-'))) {
      found = true;
      keywords.push(pattern);
    }
  });
  
  return {
    found,
    keywords,
    title: document.title,
    url: window.location.href,
    content: found ? text.substring(0, 5000) : null
  };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'detectTerms') {
    try {
      const result = detectTerms();
      sendResponse(result);
    } catch (error) {
      sendResponse({ found: false, error: error.message });
    }
    return true;
  }
});

// Auto-detect on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      const result = detectTerms();
      if (result.found) {
        console.log('Auto-detected terms:', result.keywords);
      }
    }, 1000);
  });
} else {
  setTimeout(() => {
    const result = detectTerms();
    if (result.found) {
      console.log('Auto-detected terms:', result.keywords);
    }
  }, 1000);
}