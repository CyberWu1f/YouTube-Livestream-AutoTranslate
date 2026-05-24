// ==UserScript==
// @name         YouTube Live Chat Auto Translator
// @namespace    https://github.com/Cyb3rWu1f/Live-Chat-Auto-Translator
// @version      2.1
// @description  Automatically detects and translates non-English YouTube live chat comments using Google Translate.
// @author       Cyb3rW01f / Cyb3rWu1f
// @match        https://www.youtube.com/live_chat*
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        targetLanguage: 'en',
        showOriginal: true,
        translateDelay: 100,
        cacheSize: 500
    };

    const translationCache = new Map();
    const pendingTranslations = new Map();

    let replyInLanguage = null;

    function isEnglish(text) {
        const nonLatinScripts = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0400-\u04FF\u0500-\u052F\u2DE0-\u2DFF\uA640-\uA69F\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/;

        if (nonLatinScripts.test(text)) {
            return false;
        }

        const cleanText = text.replace(/https?:\/\/\S+/g, '')
                              .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
                              .replace(/[^\w\s]/g, '')
                              .toLowerCase();

        if (cleanText.trim().length < 3) return true;

        const englishWords = /\b(the|is|are|was|were|be|been|have|has|had|do|does|did|will|would|could|should|can|may|might|must|shall|a|an|and|or|but|if|then|so|not|no|yes|this|that|these|those|what|when|where|who|why|how|i|you|he|she|it|we|they|me|him|her|us|them|my|your|his|our|their|said|hi|hello)\b/gi;
        const matches = cleanText.match(englishWords);

        const wordCount = cleanText.split(/\s+/).filter(w => w.length > 0).length;
        return matches && matches.length / wordCount > 0.3;
    }

    async function translateText(text, fromLang = 'auto', toLang = CONFIG.targetLanguage) {
        const cacheKey = `${fromLang}:${text}`;
        if (translationCache.has(cacheKey)) {
            return translationCache.get(cacheKey);
        }

        if (pendingTranslations.has(cacheKey)) {
            return pendingTranslations.get(cacheKey);
        }

        const translationPromise = (async () => {
            try {
                const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURIComponent(text)}`;

                const response = await fetch(url);
                const data = await response.json();

                const translatedText = data[0].map(item => item[0]).join('');
                const detectedLang = data[2] || fromLang;

                const result = {
                    translated: translatedText,
                    detectedLanguage: detectedLang,
                    original: text
                };

                translationCache.set(cacheKey, result);
                if (translationCache.size > CONFIG.cacheSize) {
                    const firstKey = translationCache.keys().next().value;
                    translationCache.delete(firstKey);
                }

                pendingTranslations.delete(cacheKey);
                return result;
            } catch (error) {
                pendingTranslations.delete(cacheKey);
                throw error;
            }
        })();

        pendingTranslations.set(cacheKey, translationPromise);
        return translationPromise;
    }

    const languageNames = {
        'es': 'Spanish', 'fr': 'French', 'de': 'German', 'it': 'Italian',
        'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese', 'ko': 'Korean',
        'zh-CN': 'Chinese', 'zh-TW': 'Chinese', 'ar': 'Arabic', 'hi': 'Hindi',
        'th': 'Thai', 'vi': 'Vietnamese', 'id': 'Indonesian', 'tr': 'Turkish',
        'pl': 'Polish', 'nl': 'Dutch', 'sv': 'Swedish', 'da': 'Danish',
        'fi': 'Finnish', 'no': 'Norwegian', 'cs': 'Czech', 'hu': 'Hungarian',
        'ro': 'Romanian', 'uk': 'Ukrainian', 'el': 'Greek', 'he': 'Hebrew'
    };

    function getLanguageName(code) {
        return languageNames[code] || code.toUpperCase();
    }

    async function processMessage(node) {
        if (node.dataset.translated) return;
        node.dataset.translated = 'processing';

        const messageElement = node.querySelector('#message');
        if (!messageElement) {
            console.log('[YT Translator] No message element found in node');
            return;
        }

        const messageText = messageElement.innerText.trim();
        console.log('[YT Translator] Processing message:', messageText);

        if (!messageText || messageText.length < 1) {
            console.log('[YT Translator] Message empty, skipping');
            return;
        }

        if (isEnglish(messageText)) {
            console.log('[YT Translator] Message detected as English, skipping');
            node.dataset.translated = 'english';
            return;
        }

        console.log('[YT Translator] Message not English, translating...');

        try {
            const result = await translateText(messageText);
            console.log('[YT Translator] Translation result:', result);

            if (result.translated.toLowerCase() === messageText.toLowerCase()) {
                console.log('[YT Translator] Translation same as original, skipping');
                node.dataset.translated = 'english';
                return;
            }

            node.dataset.detectedLanguage = result.detectedLanguage;

            const langCode = result.detectedLanguage;
            const langName = getLanguageName(langCode);
            const translationTag = document.createElement('span');
            translationTag.style.cssText = `
                color: #3ea6ff;
                font-weight: bold;
                margin-right: 4px;
                font-size: 0.9em;
            `;
            translationTag.textContent = `[${langName}→EN] `;

            const translatedSpan = document.createElement('span');
            translatedSpan.style.cssText = `
                color: #f1f1f1;
                background: rgba(62, 166, 255, 0.1);
                padding: 2px 4px;
                border-radius: 2px;
            `;
            translatedSpan.textContent = result.translated;

            while (messageElement.firstChild) {
                messageElement.removeChild(messageElement.firstChild);
            }

            messageElement.appendChild(translationTag);
            messageElement.appendChild(translatedSpan);

            if (CONFIG.showOriginal) {
                const originalSpan = document.createElement('div');
                originalSpan.style.cssText = `
                    color: #aaa;
                    font-size: 0.85em;
                    margin-top: 2px;
                    font-style: italic;
                `;
                originalSpan.textContent = `Original: ${messageText}`;
                messageElement.appendChild(originalSpan);
            }

            node.dataset.translated = 'true';
            console.log('[YT Translator] Message translated successfully');
        } catch (error) {
            console.error('[YT Translator] Translation error:', error);
            node.dataset.translated = 'error';
        }
    }

    function init() {
        console.log('[YT Translator] Attempting to initialize...');

        let chatItems = document.querySelector('#items.yt-live-chat-item-list-renderer');
        if (!chatItems) {
            chatItems = document.querySelector('yt-live-chat-item-list-renderer #items');
        }
        if (!chatItems) {
            chatItems = document.querySelector('#chat #items');
        }

        if (!chatItems) {
            console.log('[YT Translator] Chat items container not found, retrying in 1s...');
            setTimeout(init, 1000);
            return;
        }

        console.log('[YT Translator] Chat container found!', chatItems);

        const existingMessages = chatItems.querySelectorAll('yt-live-chat-text-message-renderer');
        console.log(`[YT Translator] Found ${existingMessages.length} existing messages`);
        existingMessages.forEach(node => {
            setTimeout(() => processMessage(node), Math.random() * 500);
        });

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.tagName === 'YT-LIVE-CHAT-TEXT-MESSAGE-RENDERER') {
                        console.log('[YT Translator] New message detected');
                        setTimeout(() => processMessage(node), CONFIG.translateDelay);
                    }
                });
            });
        });

        observer.observe(chatItems, { childList: true });
        console.log('[YT Translator] Observer started - monitoring for new messages');

        initReplyFeature();
    }

    function initReplyFeature() {
        console.log('[YT Translator] Initializing reply feature...');

        let lastClickedMessage = null;
        let lastProcessedMenu = null;

        document.addEventListener('click', (e) => {
            lastProcessedMenu = null;

            const messageRenderer = e.target.closest('yt-live-chat-text-message-renderer');
            if (messageRenderer) {
                lastClickedMessage = messageRenderer;

                if (messageRenderer.dataset.detectedLanguage) {
                    console.log('[YT Translator] Clicked on translated message from:', messageRenderer.dataset.detectedLanguage);
                } else {
                    console.log('[YT Translator] Clicked on message (no translation detected)');
                }
            }

            const authorChip = e.target.closest('yt-live-chat-author-chip');
            if (authorChip && !messageRenderer) {
                const parentMessage = authorChip.closest('yt-live-chat-text-message-renderer');
                if (parentMessage) {
                    lastClickedMessage = parentMessage;
                    console.log('[YT Translator] Clicked on author chip, message:', parentMessage.dataset.detectedLanguage);
                }
            }
        }, true);

        const menuObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        tryInjectIntoNode(node);
                    }
                });

                if (mutation.type === 'attributes' && mutation.target.nodeType === 1) {
                    const target = mutation.target;
                    if (target.tagName === 'TP-YT-IRON-DROPDOWN' ||
                        target.classList.contains('dropdown') ||
                        target.id === 'dropdown') {
                        const isVisible = target.style.display !== 'none' &&
                                        target.style.visibility !== 'hidden' &&
                                        !target.hasAttribute('aria-hidden');
                        if (isVisible) {
                            console.log('[YT Translator] Menu became visible, injecting button');
                            tryInjectIntoNode(target);
                        }
                    }
                }
            });
        });

        function tryInjectIntoNode(node) {
            const tryInject = () => {
                let injected = false;

                if (node.tagName === 'TP-YT-IRON-DROPDOWN' || node.querySelector('tp-yt-iron-dropdown')) {
                    injected = injectReplyButton(node, lastClickedMessage) || injected;
                }

                const menuRenderer = node.querySelector('yt-live-chat-author-badge-context-menu-renderer');
                if (menuRenderer) {
                    injected = injectReplyButton(menuRenderer, lastClickedMessage) || injected;
                }

                if (node.tagName === 'YT-LIVE-CHAT-AUTHOR-BADGE-CONTEXT-MENU-RENDERER') {
                    injected = injectReplyButton(node, lastClickedMessage) || injected;
                }

                return injected;
            };

            tryInject();
            setTimeout(tryInject, 50);
            setTimeout(tryInject, 150);
        }

        menuObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class', 'aria-hidden']
        });

        interceptChatInput();
    }

    function injectReplyButton(menuContainer, messageRenderer) {
        console.log('[YT Translator] injectReplyButton called');

        let menuItems = menuContainer.querySelector('yt-live-chat-author-badge-context-menu-renderer #items');
        if (!menuItems) {
            menuItems = menuContainer.querySelector('#items');
        }
        if (!menuItems) {
            menuItems = menuContainer.querySelector('tp-yt-paper-listbox');
        }
        if (!menuItems) {
            const renderer = menuContainer.querySelector('yt-live-chat-author-badge-context-menu-renderer');
            if (renderer) {
                menuItems = renderer.querySelector('#items');
            }
        }
        if (!menuItems) {
            const popup = menuContainer.querySelector('ytd-menu-popup-renderer');
            if (popup) {
                menuItems = popup.querySelector('#items');
            }
        }

        if (!menuItems) {
            console.log('[YT Translator] Could not find menu items container');
            return false;
        }

        console.log('[YT Translator] Found menu items container');

        if (!messageRenderer) {
            console.log('[YT Translator] No message renderer context');
            return false;
        }

        const detectedLang = messageRenderer.dataset.detectedLanguage;
        console.log('[YT Translator] Message detected language:', detectedLang);

        if (!detectedLang || detectedLang === 'en' || detectedLang === 'english') {
            console.log('[YT Translator] Message is in English or not translated, skipping button injection');
            return false;
        }

        const existingButtons = menuItems.querySelectorAll('.yt-translator-reply-btn');
        existingButtons.forEach(btn => {
            console.log('[YT Translator] Removing old button');
            btn.remove();
        });

        const langName = getLanguageName(detectedLang);
        console.log('[YT Translator] Injecting NEW reply button for language:', langName);

        const replyItem = document.createElement('div');
        replyItem.className = 'yt-translator-reply-btn';
        replyItem.textContent = `🌐 Respond in ${langName}`;
        replyItem.setAttribute('role', 'menuitem');
        replyItem.setAttribute('tabindex', '0');

        replyItem.style.cssText = `
            cursor: pointer !important;
            padding: 12px 16px !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            color: #ffffff !important;
            background: #3ea6ff !important;
            font-weight: 700 !important;
            font-size: 15px !important;
            font-family: "YouTube Sans", "Roboto", sans-serif !important;
            white-space: nowrap !important;
            border-radius: 4px !important;
            margin: 8px 8px !important;
            box-shadow: 0 2px 8px rgba(62, 166, 255, 0.4) !important;
            z-index: 9999 !important;
            position: relative !important;
        `;

        replyItem.addEventListener('mouseenter', () => {
            replyItem.style.backgroundColor = '#2d8fd8 !important';
        });
        replyItem.addEventListener('mouseleave', () => {
            replyItem.style.backgroundColor = '#3ea6ff !important';
        });

        attachButtonClickHandler(replyItem, detectedLang, langName, menuContainer);

        menuItems.insertBefore(replyItem, menuItems.firstChild);

        setTimeout(() => {
            replyItem.style.display = 'block';
            replyItem.style.visibility = 'visible';
            replyItem.style.opacity = '1';
        }, 10);

        console.log('[YT Translator] Button injected successfully!');
        console.log('[YT Translator] Button element:', replyItem);
        console.log('[YT Translator] Button parent:', menuItems);

        return true;
    }

    function attachButtonClickHandler(replyItem, detectedLang, langName, menuContainer) {
        replyItem.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[YT Translator] Reply button clicked, setting language to:', detectedLang, langName);
            replyInLanguage = { code: detectedLang, name: langName };
            updateChatInputPlaceholder();

            const dropdown = menuContainer.closest('tp-yt-iron-dropdown');
            if (dropdown && dropdown.close) {
                dropdown.close();
            }

            if (menuContainer.style) {
                menuContainer.style.display = 'none';
            }

            setTimeout(() => {
                const chatInput = document.querySelector('yt-live-chat-text-input-field-renderer #input');
                if (chatInput) {
                    chatInput.focus();
                }
            }, 100);
        });
    }

    function updateChatInputPlaceholder() {
        const chatInput = document.querySelector('#input');
        const chatInputContainer = document.querySelector('yt-live-chat-text-input-field-renderer');

        if (chatInput && replyInLanguage) {
            console.log('[YT Translator] Activating reply mode for:', replyInLanguage.name);
            chatInput.setAttribute('placeholder', `💬 Replying in ${replyInLanguage.name} - Click translate button...`);

            if (chatInputContainer) {
                chatInputContainer.style.border = '2px solid #3ea6ff';
                chatInputContainer.style.borderRadius = '4px';
                chatInputContainer.style.boxShadow = '0 0 8px rgba(62, 166, 255, 0.5)';
            }

            showTranslateButton();
        } else if (chatInput) {
            console.log('[YT Translator] Deactivating reply mode');
            chatInput.setAttribute('placeholder', 'Say something...');

            if (chatInputContainer) {
                chatInputContainer.style.border = '';
                chatInputContainer.style.borderRadius = '';
                chatInputContainer.style.boxShadow = '';
            }

            hideTranslateButton();
        }
    }

    function showTranslateButton() {
        let translateBtn = document.querySelector('#yt-translator-btn');
        if (translateBtn) {
            translateBtn.style.display = 'inline-flex';
            if (replyInLanguage) {
                translateBtn.title = `Translate to ${replyInLanguage.name}`;
            }
            return;
        }

        let buttonContainer = document.querySelector('#buttons.yt-live-chat-text-input-field-renderer');
        if (!buttonContainer) {
            buttonContainer = document.querySelector('yt-live-chat-text-input-field-renderer #buttons');
        }
        if (!buttonContainer) {
            buttonContainer = document.querySelector('#chat-input-buttons');
        }
        if (!buttonContainer) {
            const sendButton = document.querySelector('#send-button');
            if (sendButton) {
                buttonContainer = sendButton.parentElement;
            }
        }

        if (!buttonContainer) {
            console.log('[YT Translator] Could not find button container, trying again...');
            setTimeout(showTranslateButton, 500);
            return;
        }

        console.log('[YT Translator] Found button container:', buttonContainer);

        translateBtn = document.createElement('button');
        translateBtn.id = 'yt-translator-btn';
        translateBtn.type = 'button';
        translateBtn.title = `Translate to ${replyInLanguage ? replyInLanguage.name : 'target language'}`;
        translateBtn.textContent = '🌐';

        translateBtn.style.cssText = `
            background: #3ea6ff;
            border: none;
            border-radius: 50%;
            color: white;
            cursor: pointer;
            font-size: 18px;
            width: 40px;
            height: 40px;
            padding: 0;
            margin: 0 4px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
            flex-shrink: 0;
        `;

        translateBtn.addEventListener('mouseenter', () => {
            translateBtn.style.background = '#2d8fd8';
        });
        translateBtn.addEventListener('mouseleave', () => {
            translateBtn.style.background = '#3ea6ff';
        });

        translateBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (!replyInLanguage) {
                alert('No target language selected. Click on a translated message first.');
                return;
            }

            let chatInput = document.querySelector('yt-live-chat-text-input-field-renderer #input');
            if (!chatInput) {
                chatInput = document.querySelector('#chat-input #input');
            }
            if (!chatInput) {
                chatInput = document.querySelector('div[contenteditable="true"]#input');
            }
            if (!chatInput) {
                chatInput = document.querySelector('#input[contenteditable]');
            }

            if (!chatInput) {
                console.log('[YT Translator] Chat input not found');
                alert('Could not find chat input box.');
                return;
            }

            let originalText = '';
            if (chatInput.value) {
                originalText = chatInput.value;
            } else if (chatInput.textContent) {
                originalText = chatInput.textContent;
            } else if (chatInput.innerText) {
                originalText = chatInput.innerText;
            }

            originalText = originalText.trim();

            console.log('[YT Translator] Input element:', chatInput);
            console.log('[YT Translator] Input element tag:', chatInput.tagName);
            console.log('[YT Translator] Input element type:', chatInput.getAttribute('contenteditable'));
            console.log('[YT Translator] Original text found:', originalText);

            if (!originalText || originalText.length === 0) {
                alert('Please type a message first.');
                return;
            }

            console.log('[YT Translator] Translate button clicked, translating to', replyInLanguage.name);

            translateBtn.textContent = '⏳';
            translateBtn.disabled = true;

            try {
                const result = await translateText(originalText, 'en', replyInLanguage.code);
                console.log('[YT Translator] Translated result:', result.translated);

                chatInput.textContent = result.translated;
                chatInput.innerText = result.translated;
                if (chatInput.value !== undefined) {
                    chatInput.value = result.translated;
                }

                chatInput.dispatchEvent(new Event('input', { bubbles: true }));
                chatInput.dispatchEvent(new Event('change', { bubbles: true }));
                chatInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

                translateBtn.textContent = '✓';
                setTimeout(() => {
                    translateBtn.textContent = '🌐';
                    translateBtn.disabled = false;
                }, 1000);

                console.log(`[YT Translator] Message translated to ${replyInLanguage.name}, ready to send`);

            } catch (error) {
                console.error('[YT Translator] Translation error:', error);
                alert('Translation failed: ' + error.message);
                translateBtn.textContent = '🌐';
                translateBtn.disabled = false;
            }
        });

        const sendButton = buttonContainer.querySelector('#send-button');
        if (sendButton) {
            buttonContainer.insertBefore(translateBtn, sendButton);
        } else {
            buttonContainer.appendChild(translateBtn);
        }

        console.log('[YT Translator] Translate button added');
    }

    function hideTranslateButton() {
        const translateBtn = document.querySelector('#yt-translator-btn');
        if (translateBtn) {
            translateBtn.style.display = 'none';
        }
    }

    function interceptChatInput() {
        console.log('[YT Translator] Setting up chat input interceptor...');

        document.addEventListener('click', (e) => {
            const sendButton = e.target.closest('#send-button button');
            if (sendButton && replyInLanguage) {
                setTimeout(() => {
                    console.log('[YT Translator] Message sent, resetting reply mode');
                    replyInLanguage = null;
                    updateChatInputPlaceholder();
                }, 500);
            }
        }, true);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && replyInLanguage) {
                const chatInput = document.querySelector('#input');
                if (chatInput && document.activeElement === chatInput) {
                    setTimeout(() => {
                        console.log('[YT Translator] Message sent via Enter, resetting reply mode');
                        replyInLanguage = null;
                        updateChatInputPlaceholder();
                    }, 500);
                }
            }
        }, true);
    }

    function startInit() {
        console.log('[YT Translator] Script loaded');

        const style = document.createElement('style');
        style.textContent = `
            .yt-translator-reply-btn {
                display: block !important;
                visibility: visible !important;
            }
            .yt-translator-reply-btn #label {
                display: block !important;
            }
        `;
        document.head.appendChild(style);

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
        setTimeout(init, 2000);
        setTimeout(init, 4000);
        setTimeout(init, 6000);
    }

    startInit();
})();
