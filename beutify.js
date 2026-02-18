// Inject CSS dynamically


const style = document.createElement('style');
style.textContent = `
    body {
        background-color: #111;
        color: #ffffaa;
        margin: 0;
        padding: 0.0rem;
    }

    /* Selection styling */
    ::selection {
        background: #333;   /* highlight background */
    }
    ::-moz-selection {
        background: #333;
    }

    .speak-paragraph-button {
        user-select: none;   /* prevent text selection */
        -webkit-user-select: none; /* Safari */
        -moz-user-select: none;    /* Firefox */
    }

    span.highlight { color: #9f9; } /* Green for capitalized words */
    span.short { color: #f88; } /* Red for short words (1–3 letters) */
    span.long { color: #b9f; } /* Blue for long words (> 8 letters) */

	.translation-tooltip {
			background-color: #333;
			color: #fff;
			border-radius: 0;
			font-size: 16px;
			z-index: 1000;
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			width: 100%;
			text-align: center;
			pointer-events: none; /* Tooltip won't block mouse interactions */
			box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.2);
			white-space: pre-wrap; 
			word-wrap: break-word; /* Wrap long words */
			max-height: 50vh;
			overflow-x:auto;
			
	}
    .section-title {
        font-size: 1.4rem;
        color: #ffd;
        margin-top: 2rem;
        margin-bottom: 1rem;
        border-bottom: 1px solid #444;
    }

    .paragraph-index-tooltip {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: #222;
        color: #fff;
        font-size: 12px;
        padding: 4px 8px;
        border-radius: 4px;
        z-index: 1000;
        box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.2);
    }

    .tts-control-bar {
        position: fixed;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        background-color: #222;
        color: #fff;
        padding: 2px 4px;
        z-index: 2000;
        box-shadow: 0px 2px 6px rgba(0, 0, 0, 0.4);
        display: none;
        flex-direction: row;
        align-items: center;
        gap: 3px;
        user-select: none;
        border-radius: 0 0 4px 4px;
        white-space: nowrap;
        flex-wrap: nowrap;
        max-width: 95vw;
    }

    .tts-control-bar.visible {
        display: flex;
    }

    .tts-control-bar button {
        background-color: #333;
        border: 1px solid #555;
        color: #fff;
        padding: 1px 4px;
        cursor: pointer;
        border-radius: 2px;
        font-size: 10px;
        transition: background-color 0.15s;
        line-height: 1;
        min-width: 18px;
        flex-shrink: 0;
    }

    .tts-control-bar button:hover {
        background-color: #444;
    }

    .tts-control-bar button:active {
        background-color: #222;
    }

    .tts-control-bar button.active {
        background-color: #4a4;
        border-color: #6c6;
    }

    .tts-control-group {
        display: flex;
        gap: 2px;
        align-items: center;
    }

    .tts-speed-display {
        min-width: 26px;
        text-align: center;
        font-weight: bold;
        color: #9f9;
        font-size: 10px;
        flex-shrink: 0;
    }

    .tts-divider {
        width: 1px;
        height: 12px;
        background-color: #555;
        margin: 0 1px;
        flex-shrink: 0;
    }

    .tts-status {
        color: #999;
        font-size: 9px;
        margin-left: 2px;
        flex-shrink: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 60px;
        max-width: 60px;
        text-align: left;
    }
    #tts-auto-translate {
        font-weight: bold;
        font-size: 9px;
        padding: 1px 3px;
        min-width: 14px;
    }
		.br-small {
				display: block;
				line-height: 0.5; 
		}		
        .br-smaller {
                display: block;
                line-height: 0.15; 
        }   
		p {
			padding-bottom: 1rem ; 
			border-bottom: white 1px dotted ; 
			margin-bottom: 0 ; 
            caret-color: transparent; /* This hides the blinking cursor */
		}
		
p {
    position: relative;          /* Let’s anchor absolutely positioned children */
    padding-left: 0.7rem; 
    padding-right: 30px;         /* Prevent text from overlapping the button */
}

.speak-paragraph-button {
    position: absolute;          /* Absolutely position it in the top-right corner */
    top: 0;
    right: 0;
    margin: 0px;                 /* Some spacing from the edges */
    cursor: pointer;
    border: 1px solid #fff;
    background: #333;
    color: #fff;
    padding: 2px 5px;
    font-size: 14px;
    border-radius: 3px;
}


`;
document.head.appendChild(style);


let russianVoice = null;

// Load voices and find the Russian one
function loadVoices() {
    const voices = speechSynthesis.getVoices();
    russianVoice = voices.find(v => v.lang === 'ru-RU') || null;
}

// Some browsers load voices asynchronously
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
} else {
    loadVoices(); // Fallback if event is not supported
}

const protectedPhrases = [
    'т. е.',
    'и т. д',
    'т. к.',
    'тыс.'
];

// Highlight text logic
document.addEventListener('DOMContentLoaded', () => {
    // Create TTS control bar
    createTTSControlBar();

    const paragraphs = document.querySelectorAll('p');
    const indexTooltip = document.createElement('div');
    indexTooltip.className = 'paragraph-index-tooltip';
    document.body.appendChild(indexTooltip);

    paragraphs.forEach((paragraph, index) => {
 
        paragraph.id = `p${index + 1}`; 

        // Normalize all spaces to regular spaces before applying regex
        paragraph.innerHTML = paragraph.textContent
            .replace(/\u00A0/g, ' ')
            .replace(/\u202F/g, ' ');


        // 1) Protect common abbreviations to avoid splitting inside them
        protectedPhrases.forEach((phrase, i) => {
            const safeToken = `%%PROTECTED_${i}%%`;
            const escaped = phrase.replace(/\./g, '\\.').replace(/\s+/g, '[\\s\\u00A0\\u202F]?'); // allow flexible spacing
            const regex = new RegExp(escaped, 'gi'); 
            paragraph.innerHTML = paragraph.innerHTML.replace(regex, safeToken);
        });

        // 2) Wrap sentences and add <br> after them
        const sentenceRegex = /[^.!?…]+[.!?…]?/g;
        const originalHTML = paragraph.innerHTML;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = originalHTML;
        const text = tempDiv.textContent || tempDiv.innerText || "";

        const sentences = text.match(sentenceRegex) || [text];

        const wrappedSentences = sentences.map(sentence => {
            const trimmed = sentence.trim();
            if (!trimmed) return '';
            return `<span class="sentence">${trimmed}</span><br><br class="br-small">`;
        });

        paragraph.innerHTML = wrappedSentences.join('');

        // 2) Insert <br> for punctuation (old)
        // paragraph.innerHTML = paragraph.innerHTML.replace(
        //     /([.!?…])(?=(<\/[^>]+>|\s|$))/g,
        //     '$1<br><br class="br-small">'
        // );

        // 3) Restore protected phrases
        protectedPhrases.forEach((phrase, i) => {
            const safeToken = `%%PROTECTED_${i}%%`;
            const regex = new RegExp(safeToken, 'g');
            paragraph.innerHTML = paragraph.innerHTML.replace(regex, phrase);
        });

        paragraph.innerHTML = paragraph.innerHTML.replace(/([;])(\s|$)/g, '$1<br><br class="br-smaller">$2');

        // Replace commas with small <br> elements
        paragraph.innerHTML = paragraph.innerHTML.replace(/([,:])(\s|$)/g, '$1<br>$2');


				// Highlight words starting with a capital Cyrillic letter
        const updatedHTML = paragraph.innerHTML.replace(
            /([А-ЯЁ][а-яё]*)/gu,
            '<span class="highlight">$1</span>'
        );

        // Apply the updated HTML back to the paragraph
        paragraph.innerHTML = updatedHTML;

        // Highlight super short words (1–3 letters)
        paragraph.innerHTML = paragraph.innerHTML.replace(
            /(^|[\s.,;!?])([А-ЯЁа-яё]{1,3})(?=[\s.,;!?]|$)/gu,
            '$1<span class="short">$2</span>'
        );

        // Highlight long words (> 8 letters)
        paragraph.innerHTML = paragraph.innerHTML.replace(
            /(^|[\s.,;!?])([А-ЯЁа-яё]{8,})(?=[\s.,;!?]|$)/gu,
            '$1<span class="long">$2</span>'
        );

        // Show paragraph index in the bottom-right corner on hover
        paragraph.addEventListener('mouseenter', () => {
            indexTooltip.textContent = index + 1; // Set the paragraph index
            indexTooltip.style.display = 'block';
        });

        // Hide the tooltip when leaving the paragraph
        paragraph.addEventListener('mouseleave', () => {
            indexTooltip.style.display = 'none';
        });
				
							
				// Create and position the speak button
			const speakButton = document.createElement('button');
			speakButton.className = 'speak-paragraph-button';
			speakButton.textContent = '🔊'; // Or "Speak"

			const paragraphText = paragraph.textContent;


			// On click, read the full paragraph in Russian
			speakButton.addEventListener('click', () => {
                console.log("speak", paragraphText);

                // Set active sentence to first sentence in this paragraph
                const firstSentence = paragraph.querySelector('.sentence');
                if (firstSentence) {
                    const sentenceIndex = allSentences.indexOf(firstSentence);
                    if (sentenceIndex >= 0) {
                        activeSentenceIndex = sentenceIndex;
                        // Play sentence by sentence for better tracking
                        speakSentenceAt(activeSentenceIndex);
                    }
                }

                function tryOtherMethods() {
                    // Try Electron TTS functions
                    if (window.electronTTS) {
                        console.log("🔊 Using Electron IPC TTS");
                        window.electronTTS(paragraphText).then(() => {
                            console.log('🔊 Electron TTS completed');
                        }).catch((error) => {
                            console.log('🔊 Electron TTS failed, trying Google TTS:', error);
                            tryGoogleTTS();
                        });
                    } else if (window.googleTTS) {
                        console.log("🔊 Using Google TTS");
                        tryGoogleTTS();
                    } else {
                        console.log("🔊 Using browser speechSynthesis");
                        fallbackToSpeechSynthesis();
                    }
                }

                function tryGoogleTTS() {
                    window.googleTTS(paragraphText).then(() => {
                        console.log('🔊 Google TTS completed');
                    }).catch((error) => {
                        console.log('🔊 Google TTS failed, falling back to speechSynthesis:', error);
                        fallbackToSpeechSynthesis();
                    });
                }

                function fallbackToSpeechSynthesis() {
                    const utterance = new SpeechSynthesisUtterance(paragraphText);
                    utterance.lang = 'ru-RU';
                    utterance.rate = 1.0;
                    utterance.voice = russianVoice;
                    window.speechSynthesis.speak(utterance);
                }
			});

			// Append the button as a child of the paragraph
			paragraph.appendChild(speakButton);

				
				
    });
	let previousTranslation=""
    // Translation tooltip on text selection
    document.addEventListener('mouseup', () => {
        const selectedText = window.getSelection().toString().trim();
        if (selectedText) {
						
						// Check if the selection is a single word
						if (/^[А-ЯЁа-яё]+$/.test(selectedText)) { // Regex for a single Russian word
								
								if(previousTranslation == selectedText){
									// Speak the selected word using Web Speech API
									const utterance = new SpeechSynthesisUtterance(selectedText);
									utterance.lang = 'ru-RU'; // Set language to Russian
									window.speechSynthesis.speak(utterance);
									
									// Copy the word to the clipboard
									copyToClipboard(selectedText).then(() => {
											console.log(`Copied to clipboard: ${selectedText}`);
									}).catch(err => {
											console.error('Failed to copy text to clipboard:', err);
									});
									
								}
						}
						previousTranslation = selectedText


						// Fetch translation (only in browser, not in Electron)
						const isElectron = window.parent && window.parent !== window && window.parent.showIframeSelectionMenu;
						if (!isElectron) {
							fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=ru&tl=en&dt=t&q=${encodeURIComponent(selectedText.replace(/\n/g, ' '))}`)
									.then(response => response.json())
									.then(data => {
											// Remove any existing tooltip
											document.querySelectorAll('.translation-tooltip').forEach(el => el.remove());

											// Create a new tooltip
											const tooltip = document.createElement('div');
											tooltip.className = 'translation-tooltip';

											// Combine all translations into multiple lines
											const translations = data[0].map(item => item[0]).join(''); // Extract all translations
											tooltip.textContent = translations;

											// Add the tooltip to the body
											document.body.appendChild(tooltip);

											// Auto-remove the tooltip after 15 seconds
											setTimeout(() => tooltip.remove(), 15000);
									})
									.catch(err => console.error('Translation failed', err));
						}
        }
    });

    // Remove the translation tooltip when clicking outside
    document.addEventListener('click', (event) => {
        // Check if the click is outside the translation tooltip
        const tooltips = document.querySelectorAll('.translation-tooltip');
        tooltips.forEach(tooltip => {
            if (!tooltip.contains(event.target)) {
                tooltip.remove();
            }
        });
    });
});





document.addEventListener('DOMContentLoaded', () => {
    let typedNumber = ''; // To store the typed number
    let typingTimeout; // To track the timeout for waiting between keystrokes

    document.addEventListener('keydown', (event) => {
        // Check if the pressed key is a number
        if (event.key >= '0' && event.key <= '9') {
            // Append the typed digit to the number
            typedNumber += event.key;

            // Clear any existing timeout
            clearTimeout(typingTimeout);

            // Set a timeout to process the typed number after 1.5 seconds
            typingTimeout = setTimeout(() => {
                // Convert the typed number to an integer
                const paragraphIndex = parseInt(typedNumber, 10) - 1;

                // Find the corresponding paragraph
                const paragraphs = document.querySelectorAll('p');
                if (paragraphIndex >= 0 && paragraphIndex < paragraphs.length) {
                    // Scroll to the paragraph
                    paragraphs[paragraphIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });

                    // Highlight the paragraph briefly
                    paragraphs[paragraphIndex].style.backgroundColor = '#444';
                    setTimeout(() => {
                        paragraphs[paragraphIndex].style.backgroundColor = 'transparent';
                    }, 1500);
                }

                // Reset the typed number
                typedNumber = '';
            }, 800); // Wait for 0.8 seconds
        }
    });


    document.querySelectorAll('section > title').forEach(title => {
        const heading = document.createElement('h2');
        heading.className = 'section-title';

        // The whole innerText is something like: "<p>ПРЕДИСЛОВИЕ</p>"
        const raw = title.textContent.trim();

        // Try to extract the content from the <p> manually
        const match = raw.match(/<p>(.*?)<\/p>/i);

        if (match) {
            heading.textContent = match[1].trim();
        } else {
            heading.textContent = raw;
        }

        title.parentNode.replaceChild(heading, title);
    });


    allSentences = Array.from(document.querySelectorAll('span.sentence'));

    allSentences.forEach((sentenceEl, index) => {
        sentenceEl.addEventListener('click', () => {
            activeSentenceIndex = index;
        });
    });



});


document.addEventListener('keydown', (event) => {

    // Ctrl+F for search (only in Electron)
    if (event.ctrlKey && event.key === 'f') {
        // Check if we're inside Electron (parent has showLeftPanelSearch)
        if (window.parent && window.parent !== window && window.parent.showLeftPanelSearch) {
            console.log('🔍 Ctrl+F pressed in beautify.js (Electron mode)');
            event.preventDefault();
            window.parent.showLeftPanelSearch();
            return;
        }
        // Otherwise, let browser's native Ctrl+F work
    }

    if (['s', 'j', 'ArrowDown'].includes(event.key)) {
        event.preventDefault(); // Stop cursor movement
        window.scrollBy({ top: 50, behavior: 'smooth' });
    } else if (['w', 'k', 'ArrowUp'].includes(event.key)) {
        event.preventDefault(); // Stop cursor movement
        window.scrollBy({ top: -50, behavior: 'smooth' });
    }
    if ('a' == event.key ) { 
        autoScrollFlag = !autoScrollFlag ; 
    }
    if (event.key === 'x' || event.key === 'ч' || event.key === 'Escape') {
        console.log('🛑 Stop key pressed - stopping all audio');
        stopTTS(); // Use unified stop function
    }

    if (event.key === ' ') {
        event.preventDefault(); // Prevent page scroll
        // Toggle pause/play
        if (isCurrentlyPlaying) {
            console.log('⏸ Space: pausing at sentence', activeSentenceIndex);
            stopTTS();

            // Send current sentence to translator
            if (activeSentenceIndex >= 0 && activeSentenceIndex < allSentences.length) {
                const sentenceEl = allSentences[activeSentenceIndex];
                const text = sentenceEl.textContent.trim();
                if (text && window.parent && window.parent.sendToTranslator) {
                    console.log('📤 Sending to translator:', text.substring(0, 40) + '...');
                    window.parent.sendToTranslator(text);
                }
            }
        } else {
            console.log('▶ Space: resuming from sentence', activeSentenceIndex);
            if (activeSentenceIndex >= 0 && activeSentenceIndex < allSentences.length) {
                speakSentenceAt(activeSentenceIndex);
            } else {
                // No active sentence, start from beginning
                activeSentenceIndex = 0;
                speakSentenceAt(activeSentenceIndex);
            }
        }
    }

    if (event.key === 'c' && !event.ctrlKey ) {
        const sentenceEl = allSentences[activeSentenceIndex];
        if (sentenceEl) {
            const text = sentenceEl.textContent.trim();
            copyToClipboard(text).then(() => {
                console.log(`Copied sentence to clipboard: ${text}`);
            }).catch(err => {
                console.error('Failed to copy text to clipboard:', err);
            });
        }
    }
    if (event.key === 'p' || event.key === 'з') {
        const selectedText = window.getSelection().toString().trim();
        if (selectedText) {
            console.log('🔊 P key: speaking selected text');
            speechSynthesis.cancel(); // Stop any current speech
            playGoogleTTS(selectedText);
        }
    }

    if (event.key === 'h' || event.key === 'р') {
        speakSentenceAt(activeSentenceIndex);

        const sentenceEl = allSentences[activeSentenceIndex];
        const selectedText = sentenceEl?.textContent?.trim();
        if (!selectedText) return;

        // Toggle language if pressing again on the same sentence
        let targetLang = 'en';
        if (activeSentenceIndex === lastTranslatedIndex) {
            targetLang = lastTranslationLang === 'en' ? 'mk' : 'en';
        }

        lastTranslatedIndex = activeSentenceIndex;
        lastTranslationLang = targetLang;

        // Fetch translation
        fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=ru&tl=${targetLang}&dt=t&q=${encodeURIComponent(selectedText.replace(/\n/g, ' '))}`)
            .then(response => response.json())
            .then(data => {
                // Remove any existing tooltip
                document.querySelectorAll('.translation-tooltip').forEach(el => el.remove());

                // Create a new tooltip
                const tooltip = document.createElement('div');
                tooltip.className = 'translation-tooltip';

                // Combine all translations into a single string
                const translations = data[0].map(item => item[0]).join('');
                tooltip.textContent =  `${translations}`;

                // Add the tooltip to the body
                document.body.appendChild(tooltip);

                // Auto-remove the tooltip after 15 seconds
                setTimeout(() => tooltip.remove(), 15000);
            })
            .catch(err => console.error('Translation failed', err));
    }



    if (event.key === 'm' || event.key === 'ь') {
        if (activeSentenceIndex < allSentences.length - 1) {
            activeSentenceIndex++;
            speakSentenceAt(activeSentenceIndex);
        }
    }
    if (event.key === 'n' || event.key === 'т') {
        if (activeSentenceIndex > 0) {
            activeSentenceIndex--;
            speakSentenceAt(activeSentenceIndex);
        }
    }

    // Only turn off autoplay for interrupt keys (h, x, c), not navigation keys (m, n)
    if (['h', 'x', 'c', 'р', 'ч', 'з', 'escape'].includes(event.key.toLowerCase())) {
        autoContinueParagraphs = false;
        const btn = document.getElementById('tts-autoplay');
        if (btn) btn.classList.remove('active');
    }

    // 'M' key toggles autoplay (same as ⏩ button)
    if (event.key === 'M') {
        toggleAutoplay();
        // If autoplay was just turned on and we have a sentence, start playing
        if (autoContinueParagraphs) {
            if (activeSentenceIndex >= 0 && activeSentenceIndex < allSentences.length) {
                speakSentenceAt(activeSentenceIndex);
            } else if (allSentences.length > 0) {
                // Start from first sentence
                activeSentenceIndex = 0;
                speakSentenceAt(activeSentenceIndex);
            }
        }
    }

    if (event.key === 'H') {
        autoTranslateMode = !autoTranslateMode; // enable translate-everything mode
    }

});



document.addEventListener('dragstart', function (e) {
    // Create a 1x1 transparent image
    const img = new Image();
    img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAAApJREFUCNdjYAAAAAIAAeIhvDMAAAAASUVORK5CYII=';

    e.dataTransfer.setDragImage(img, 0, 0);

});





let autoScrollFlag = 0 ;




setInterval(function(){
    if(autoScrollFlag){
        window.scrollBy({ top: 1, behavior: 'smooth' });
    }
},300)


let allSentences = [];
let activeSentenceIndex = -1;
let lastTranslatedIndex = -1;
let lastTranslationLang = 'en';
let currentTTSAudio = null; // Track current Google TTS audio

// TTS Control Bar State
let ttsPlaybackRate = 1.0;
let ttsControlBar = null;
let lastPlayedText = '';
let lastPlayedCallback = null;
let isPlayingParagraph = false;
let currentPlayingParagraphIndex = -1;
let autoContinueParagraphs = false;
let isCurrentlyPlaying = false;
let sentencePauseTimeout = null;
let autoSendToTranslator = false;

// Create TTS Control Bar
function createTTSControlBar() {
    ttsControlBar = document.createElement('div');
    ttsControlBar.className = 'tts-control-bar';

    ttsControlBar.innerHTML = `
        <button id="tts-stop" title="Stop (X/Esc)">⏹</button>
        <button id="tts-replay" title="Replay">🔄</button>
        <button id="tts-autoplay" title="Auto-play paragraphs">⏩</button>
        <div class="tts-divider"></div>
        <button id="tts-speed-down" title="Slower">−</button>
        <span class="tts-speed-display" id="tts-speed-display">1.0x</span>
        <button id="tts-speed-up" title="Faster">+</button>
        <div class="tts-divider"></div>
        <button id="tts-prev-sentence" title="Prev Sentence (N)">⬅</button>
        <button id="tts-next-sentence" title="Next Sentence (M)">➡</button>
        <div class="tts-divider"></div>
        <button id="tts-prev-paragraph" title="Prev Paragraph">⬅⬅</button>
        <button id="tts-next-paragraph" title="Next Paragraph">➡➡</button>
        <div class="tts-divider"></div>
        <button id="tts-auto-translate" title="Auto-translate sentences (T)">T</button>
    `;

    document.body.appendChild(ttsControlBar);

    // Event listeners
    document.getElementById('tts-stop').addEventListener('click', stopTTS);
    document.getElementById('tts-replay').addEventListener('click', replayTTS);
    document.getElementById('tts-autoplay').addEventListener('click', toggleAutoplay);
    document.getElementById('tts-speed-down').addEventListener('click', () => changeSpeed(-0.05));
    document.getElementById('tts-speed-up').addEventListener('click', () => changeSpeed(0.05));
    document.getElementById('tts-prev-sentence').addEventListener('click', prevSentence);
    document.getElementById('tts-next-sentence').addEventListener('click', nextSentence);
    document.getElementById('tts-prev-paragraph').addEventListener('click', prevParagraph);
    document.getElementById('tts-next-paragraph').addEventListener('click', nextParagraph);
    document.getElementById('tts-auto-translate').addEventListener('click', toggleAutoTranslate);
}

// Show/hide control bar
function showTTSControlBar() {
    if (ttsControlBar) {
        ttsControlBar.classList.add('visible');
        // Ensure buttons reflect current state
        const btn = document.getElementById('tts-autoplay');
        if (btn) {
            if (autoContinueParagraphs) btn.classList.add('active');
            else btn.classList.remove('active');
        }
        const tbtn = document.getElementById('tts-auto-translate');
        if (tbtn) {
            if (autoSendToTranslator) tbtn.classList.add('active');
            else tbtn.classList.remove('active');
        }
    }
}

function hideTTSControlBar() {
    if (ttsControlBar) {
        ttsControlBar.classList.remove('visible');
    }
}

// Update status display
function updateTTSStatus(message) {
    const statusEl = document.getElementById('tts-status');
    if (statusEl) {
        statusEl.textContent = message;
    }
}

// Stop TTS
function stopTTS() {
    console.log('🛑 Stop button clicked');
    speechSynthesis.cancel();

    if (currentTTSAudio) {
        currentTTSAudio.pause();
        currentTTSAudio.currentTime = 0;
        currentTTSAudio = null;
    }

    const allAudio = document.querySelectorAll('audio');
    allAudio.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
    });

    // Clear any pending sentence pause
    if (sentencePauseTimeout) {
        clearTimeout(sentencePauseTimeout);
        sentencePauseTimeout = null;
    }

    isCurrentlyPlaying = false;
    hideTTSControlBar();
}

// Replay TTS
function replayTTS() {
    console.log('🔄 Replay button clicked');
    if (lastPlayedText) {
        stopTTS();
        playGoogleTTS(lastPlayedText, lastPlayedCallback);
    }
}

// Toggle autoplay
function toggleAutoplay() {
    autoContinueParagraphs = !autoContinueParagraphs;

    const btn = document.getElementById('tts-autoplay');
    if (btn) {
        if (autoContinueParagraphs) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }
    console.log('⏩ Autoplay:', autoContinueParagraphs ? 'ON' : 'OFF');
}

// Toggle auto-translate
function toggleAutoTranslate() {
    autoSendToTranslator = !autoSendToTranslator;
    const btn = document.getElementById('tts-auto-translate');
    if (btn) {
        if (autoSendToTranslator) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }
    console.log('🌐 Auto-translate:', autoSendToTranslator ? 'ON' : 'OFF');
}

// Change playback speed
function changeSpeed(delta) {
    ttsPlaybackRate = Math.max(0.5, Math.min(3.0, ttsPlaybackRate + delta));
    ttsPlaybackRate = Math.round(ttsPlaybackRate * 100) / 100; // Round to 2 decimals

    const display = document.getElementById('tts-speed-display');
    if (display) {
        display.textContent = ttsPlaybackRate.toFixed(2) + 'x';
    }

    // Apply to current audio if playing
    if (currentTTSAudio) {
        currentTTSAudio.playbackRate = ttsPlaybackRate;
    }

    console.log(`⚡ Speed changed to ${ttsPlaybackRate}x`);
}

// Navigation functions
function prevSentence() {
    if (activeSentenceIndex > 0) {
        console.log(`⬅ prevSentence: ${activeSentenceIndex} → ${activeSentenceIndex - 1}`);
        activeSentenceIndex--;
        speakSentenceAt(activeSentenceIndex);
    }
}

function nextSentence() {
    if (activeSentenceIndex < allSentences.length - 1) {
        console.log(`➡ nextSentence: ${activeSentenceIndex} → ${activeSentenceIndex + 1}`);
        activeSentenceIndex++;
        speakSentenceAt(activeSentenceIndex);
    }
}

function prevParagraph() {
    // Find the paragraph containing current sentence
    if (activeSentenceIndex >= 0 && activeSentenceIndex < allSentences.length) {
        const currentSentence = allSentences[activeSentenceIndex];
        const currentParagraph = currentSentence.closest('p');
        if (!currentParagraph) return;

        const prevPara = currentParagraph.previousElementSibling;

        if (prevPara && prevPara.tagName === 'P') {
            // Find first sentence in previous paragraph
            const firstSentence = prevPara.querySelector('.sentence');
            if (firstSentence) {
                const index = allSentences.indexOf(firstSentence);
                if (index >= 0) {
                    activeSentenceIndex = index;
                    playParagraphFromSentence(activeSentenceIndex);
                }
            }
        }
    } else {
        // If no active sentence, start from first paragraph
        const firstPara = document.querySelector('p');
        if (firstPara) {
            const firstSentence = firstPara.querySelector('.sentence');
            if (firstSentence) {
                const index = allSentences.indexOf(firstSentence);
                if (index >= 0) {
                    activeSentenceIndex = index;
                    playParagraphFromSentence(activeSentenceIndex);
                }
            }
        }
    }
}

function nextParagraph() {
    // Find the paragraph containing current sentence
    if (activeSentenceIndex >= 0 && activeSentenceIndex < allSentences.length) {
        const currentSentence = allSentences[activeSentenceIndex];
        const currentParagraph = currentSentence.closest('p');
        if (!currentParagraph) return;

        const nextPara = currentParagraph.nextElementSibling;

        if (nextPara && nextPara.tagName === 'P') {
            // Find first sentence in next paragraph
            const firstSentence = nextPara.querySelector('.sentence');
            if (firstSentence) {
                const index = allSentences.indexOf(firstSentence);
                if (index >= 0) {
                    activeSentenceIndex = index;
                    playParagraphFromSentence(activeSentenceIndex);
                }
            }
        }
    } else {
        // If no active sentence, start from first paragraph
        const firstPara = document.querySelector('p');
        if (firstPara) {
            const firstSentence = firstPara.querySelector('.sentence');
            if (firstSentence) {
                const index = allSentences.indexOf(firstSentence);
                if (index >= 0) {
                    activeSentenceIndex = index;
                    playParagraphFromSentence(activeSentenceIndex);
                }
            }
        }
    }
}

function playParagraphFromSentence(sentenceIndex) {
    if (sentenceIndex >= 0 && sentenceIndex < allSentences.length) {
        const sentence = allSentences[sentenceIndex];
        const paragraph = sentence.closest('p');
        if (paragraph) {
            stopTTS();
            activeSentenceIndex = sentenceIndex;
            // Play sentence by sentence for better tracking
            speakSentenceAt(activeSentenceIndex);
        }
    }
}

function playNextParagraphAuto() {
    if (!autoContinueParagraphs) return;

    if (activeSentenceIndex >= 0 && activeSentenceIndex < allSentences.length) {
        const currentSentence = allSentences[activeSentenceIndex];
        const currentParagraph = currentSentence.closest('p');
        if (!currentParagraph) return;

        const nextPara = currentParagraph.nextElementSibling;

        if (nextPara && nextPara.tagName === 'P') {
            // Find first sentence in next paragraph
            const firstSentence = nextPara.querySelector('.sentence');
            if (firstSentence) {
                const index = allSentences.indexOf(firstSentence);
                if (index >= 0) {
                    activeSentenceIndex = index;
                    playParagraphFromSentence(activeSentenceIndex);
                }
            }
        } else {
            // No more paragraphs, turn off autoplay and hide bar
            console.log('⏩ Reached end, turning off autoplay');
            autoContinueParagraphs = false;
            isCurrentlyPlaying = false;
            const btn = document.getElementById('tts-autoplay');
            if (btn) btn.classList.remove('active');
            setTimeout(() => {
                hideTTSControlBar();
            }, 800);
        }
    }
}

// Universal clipboard function
function copyToClipboard(text) {
    // Try Electron clipboard first
    if (window.electronClipboard) {
        return window.electronClipboard(text);
    }

    // Try direct require approach
    try {
        if (typeof require !== 'undefined') {
            const { clipboard } = require('electron');
            clipboard.writeText(text);
            console.log('📋 Direct Electron clipboard successful');
            return Promise.resolve();
        }
    } catch (e) {
        console.log('📋 Direct Electron clipboard failed:', e);
    }

    // Fallback to web clipboard API
    if (navigator.clipboard) {
        return navigator.clipboard.writeText(text);
    }

    // Final fallback to legacy method
    return new Promise((resolve, reject) => {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (successful) {
                resolve();
            } else {
                reject(new Error('Copy command failed'));
            }
        } catch (e) {
            reject(e);
        }
    });
}

// Split text into chunks respecting sentence boundaries
function chunkTextForTTS(text, maxChars = 200) {
    const chunks = [];

    // Split by sentence boundaries
    const sentenceRegex = /[^.!?…]+[.!?…]?/g;
    const sentences = text.match(sentenceRegex) || [text];

    let currentChunk = '';

    for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (!trimmed) continue;

        // If adding this sentence would exceed max, save current chunk and start new one
        if (currentChunk && (currentChunk.length + trimmed.length > maxChars)) {
            chunks.push(currentChunk.trim());
            currentChunk = trimmed;
        } else {
            currentChunk += (currentChunk ? ' ' : '') + trimmed;
        }
    }

    // Add remaining chunk
    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    // If any chunk is still too long, split it by words
    const finalChunks = [];
    for (const chunk of chunks) {
        if (chunk.length <= maxChars) {
            finalChunks.push(chunk);
        } else {
            // Split long chunk by words
            const words = chunk.split(/\s+/);
            let wordChunk = '';
            for (const word of words) {
                if (wordChunk && (wordChunk.length + word.length + 1 > maxChars)) {
                    finalChunks.push(wordChunk.trim());
                    wordChunk = word;
                } else {
                    wordChunk += (wordChunk ? ' ' : '') + word;
                }
            }
            if (wordChunk.trim()) {
                finalChunks.push(wordChunk.trim());
            }
        }
    }

    return finalChunks;
}

// Play a single chunk with Google TTS
function playGoogleTTSChunk(text, onEndCallback = null, onErrorCallback = null) {
    const encodedText = encodeURIComponent(text);
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ru&client=gtx&q=${encodedText}`;

    const audio = new Audio();
    audio.src = ttsUrl;
    audio.playbackRate = ttsPlaybackRate; // Apply current playback rate
    currentTTSAudio = audio;

    let callbackFired = false; // Prevent double callbacks

    audio.onended = () => {
        if (callbackFired) return;
        callbackFired = true;
        console.log('🔊 Google TTS chunk completed');
        currentTTSAudio = null;
        if (onEndCallback) onEndCallback();
    };

    audio.onerror = (e) => {
        if (callbackFired) return;
        callbackFired = true;
        console.log('🔊 Google TTS chunk failed (onerror):', e.type);
        currentTTSAudio = null;
        if (onErrorCallback) {
            onErrorCallback(e);
        } else if (onEndCallback) {
            onEndCallback(); // Continue even on error
        }
    };

    audio.play().catch((e) => {
        if (callbackFired) return;
        callbackFired = true;
        console.log('🔊 Audio play failed (catch):', e.message);
        currentTTSAudio = null;
        if (onErrorCallback) {
            onErrorCallback(e);
        } else if (onEndCallback) {
            onEndCallback();
        }
    });
}

// Universal Google TTS function with chunking
function playGoogleTTS(text, onEndCallback = null) {
    console.log('🔊 playGoogleTTS called with:', text.substring(0, 50) + '...');

    // Store for replay
    lastPlayedText = text;
    lastPlayedCallback = onEndCallback;

    // Mark as playing
    isCurrentlyPlaying = true;

    // Show control bar
    showTTSControlBar();

    // Stop any previous audio
    if (currentTTSAudio) {
        currentTTSAudio.pause();
        currentTTSAudio.currentTime = 0;
        currentTTSAudio = null;
    }

    const chunks = chunkTextForTTS(text);
    console.log(`🔊 Split into ${chunks.length} chunks`);

    let chunkIndex = 0;
    let hadError = false;
    let fallbackCalled = false;

    function playNextChunk() {
        if (chunkIndex >= chunks.length) {
            // All chunks completed
            console.log('🔊 All chunks completed');
            updateTTSStatus('✓ Completed');
            if (hadError && !fallbackCalled) {
                // If we had errors, fall back to speechSynthesis for entire text
                fallbackCalled = true;
                console.log('🔊 Had errors, falling back to speechSynthesis');
                updateTTSStatus('Fallback...');
                fallbackToSpeechSynthesis(text, () => {
                    isCurrentlyPlaying = false;
                    hideTTSControlBar();
                    if (onEndCallback) onEndCallback();
                });
            } else if (!hadError) {
                // Don't hide immediately, let the callback decide
                isCurrentlyPlaying = false;
                if (onEndCallback) onEndCallback();
            }
            return;
        }

        const chunk = chunks[chunkIndex];
        console.log(`🔊 Playing chunk ${chunkIndex + 1}/${chunks.length}: ${chunk.substring(0, 30)}...`);

        // Update status with chunk progress
        if (chunks.length > 1) {
            updateTTSStatus(`Playing ${chunkIndex + 1}/${chunks.length}`);
        } else {
            updateTTSStatus('Playing...');
        }

        chunkIndex++;

        playGoogleTTSChunk(
            chunk,
            () => {
                // Chunk completed successfully, play next
                playNextChunk();
            },
            (error) => {
                // Chunk failed
                console.log(`🔊 Chunk ${chunkIndex} failed:`, error);
                hadError = true;
                // Continue to next chunk anyway
                playNextChunk();
            }
        );
    }

    function fallbackToSpeechSynthesis(text, callback) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ru-RU';
        utterance.voice = russianVoice;
        utterance.rate = ttsPlaybackRate; // Apply playback rate
        utterance.onend = callback;
        speechSynthesis.speak(utterance);
    }

    // Start playing chunks
    playNextChunk();
}

function speakSentenceAt(index) {
    if (index >= 0 && index < allSentences.length) {
        const sentenceEl = allSentences[index];
        const text = sentenceEl.textContent.trim();

        console.log(`🎤 speakSentenceAt(${index}): "${text.substring(0, 40)}..."`);

        // Stop any previous audio
        speechSynthesis.cancel();

        if (autoTranslateMode) {
            translateAndShowTooltip(text, 'en');
        }

        // Send to parent translator panel when auto-translate is on
        if (autoSendToTranslator && window.parent && window.parent.sendToTranslator) {
            window.parent.sendToTranslator(text);
        }

        // Auto-next callback
        const onEndCallback = () => {
            console.log('🎵 Sentence finished. autoContinueParagraphs:', autoContinueParagraphs);

            if (autoContinueParagraphs) {
                // Speed-aware pause between sentences (300ms at 1.0x, scales down with speed)
                const pauseDuration = 300 / ttsPlaybackRate;

                sentencePauseTimeout = setTimeout(() => {
                    sentencePauseTimeout = null;
                    // Check if we're at the end of current paragraph
                    const currentPara = sentenceEl.closest('p');
                    if (currentPara) {
                        const sentencesInPara = Array.from(currentPara.querySelectorAll('.sentence'));
                        const indexInPara = sentencesInPara.indexOf(sentenceEl);

                        if (indexInPara >= 0 && indexInPara < sentencesInPara.length - 1) {
                            // More sentences in this paragraph, play next
                            console.log(`🎵 More sentences in paragraph, moving ${index} → ${index + 1}`);
                            activeSentenceIndex++;
                            speakSentenceAt(activeSentenceIndex);
                        } else {
                            // End of paragraph, play next paragraph
                            console.log('🎵 End of paragraph, jumping to next paragraph');
                            playNextParagraphAuto();
                        }
                    }
                }, pauseDuration);
            } else {
                // Autoplay is off, hide the control bar
                console.log('🎵 Autoplay off, stopping');
                isCurrentlyPlaying = false;
                setTimeout(() => {
                    hideTTSControlBar();
                }, 800);
            }
        };

        // Use Google TTS instead of speechSynthesis
        playGoogleTTS(text, onEndCallback);

        // Visual feedback
        allSentences.forEach(s => s.classList.remove('active-sentence'));
        sentenceEl.classList.add('active-sentence');
    }
}

function translateAndShowTooltip(text, lang = 'en') {
    fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=ru&tl=${lang}&dt=t&q=${encodeURIComponent(text.replace(/\n/g, ' '))}`)
        .then(response => response.json())
        .then(data => {
            document.querySelectorAll('.translation-tooltip').forEach(el => el.remove());

            const tooltip = document.createElement('div');
            tooltip.className = 'translation-tooltip';
            tooltip.textContent = data[0].map(item => item[0]).join('');
            document.body.appendChild(tooltip);

            setTimeout(() => tooltip.remove(), 15000);
        })
        .catch(err => console.error('Translation failed', err));
}

let autoTranslateMode = false;




function triggerSelectionHandlers() {
  const event = new Event("mouseup", { bubbles: true, cancelable: true });
  document.dispatchEvent(event);
}



(() => {
  const DBL_TAP_MAX_DELAY = 300; // ms
  const DBL_TAP_MAX_DIST  = 25;  // px

  let lastTapTime = 0;
  let lastTapX = 0, lastTapY = 0;
  let lastTapTarget = null;

  // Unicode-aware letter/number check
  const wordCharRe = /\p{L}|\p{N}/u;
  function isWordChar(ch) {
    return !!ch && wordCharRe.test(ch);
  }

  // Cross-browser caret range from point
  function caretRangeFromPoint(x, y) {
    if (document.caretRangeFromPoint) {
      try { return document.caretRangeFromPoint(x, y); } catch (e) { /*ignore*/ }
    }
    if (document.caretPositionFromPoint) {
      try {
        const pos = document.caretPositionFromPoint(x, y);
        if (pos) {
          const r = document.createRange();
          r.setStart(pos.offsetNode, pos.offset);
          r.collapse(true);
          return r;
        }
      } catch (e) { /*ignore*/ }
    }
    return null;
  }

  // Ensure we have a TEXT_NODE and a valid offset inside it.
  function normalizeToTextNode(range) {
    if (!range) return null;
    let node = range.startContainer;
    let offset = range.startOffset;

    if (node.nodeType === Node.TEXT_NODE) {
      // clamp offset
      offset = Math.max(0, Math.min(offset, node.textContent.length));
      return { node, offset };
    }

    // If an element node - try to pick a nearby text node
    if (node.nodeType === Node.ELEMENT_NODE) {
      // Try child at offset first
      let child = node.childNodes[offset] || node.childNodes[offset - 1] || node.firstChild;
      // Descend forward to find a text node
      while (child && child.nodeType !== Node.TEXT_NODE) {
        if (child.firstChild) {
          child = child.firstChild;
        } else if (child.nextSibling) {
          child = child.nextSibling;
        } else {
          // climb up to find next sibling
          let p = child;
          while (p && !p.nextSibling) p = p.parentNode;
          child = p ? p.nextSibling : null;
        }
      }
      if (child && child.nodeType === Node.TEXT_NODE) {
        // choose offset: if our original offset pointed to child as first candidate => 0 else end
        const newOffset = 0;
        return { node: child, offset: newOffset };
      }

      // Fallback: find first text node inside element using TreeWalker
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
      const firstText = walker.nextNode();
      if (firstText) return { node: firstText, offset: 0 };
    }

    return null;
  }

  // Get a Range for the word at (x,y). Returns null if none.
  function getWordRangeAtPoint(x, y) {
    const caret = caretRangeFromPoint(x, y);
    if (!caret) {
      return null;
    }

    const tn = normalizeToTextNode(caret);
    if (!tn || !tn.node) {
      return null;
    }

    const textNode = tn.node;
    let offset = tn.offset;
    const text = textNode.textContent || '';

    // clamp offset
    offset = Math.max(0, Math.min(offset, text.length));

    // Expand to nearest word chars
    let start = offset;
    let end = offset;

    while (start > 0 && isWordChar(text[start - 1])) start--;
    while (end < text.length && isWordChar(text[end])) end++;

    // If nothing found at that offset, try searching nearby inside same text node
    if (start === end) {
      // search left and right for any word char
      let left = -1, right = -1;
      for (let i = offset - 1; i >= 0; i--) { if (isWordChar(text[i])) { left = i; break; } }
      for (let i = offset; i < text.length; i++) { if (isWordChar(text[i])) { right = i; break; } }

      const pos = left >= 0 ? left : right;
      if (pos === -1) {
        return null;
      }
      start = pos;
      while (start > 0 && isWordChar(text[start - 1])) start--;
      end = pos + 1;
      while (end < text.length && isWordChar(text[end])) end++;
    }

    if (start === end) {
      return null;
    }

    const r = document.createRange();
    r.setStart(textNode, start);
    r.setEnd(textNode, end);
    return r;
  }

  function selectRange(r) {
    if (!r) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  }

  // Mouse double-click handler (desktop)
  document.addEventListener('dblclick', (e) => {
    try {
      const x = e.clientX, y = e.clientY;

      // Optionally restrict to inside paragraph/sentence if you want:
      // if (!e.target.closest('p')) return;

      const r = getWordRangeAtPoint(x, y);
      if (r) {
        selectRange(r);
        triggerSelectionHandlers();
        e.preventDefault();
      } 
    } catch (err) {
      console.error('[dblclick] error', err);
    }
  });

  // Touch double-tap support
  document.addEventListener('touchend', (e) => {
    try {
      const t = e.changedTouches && e.changedTouches[0];
      if (!t) { console.log('[touchend] no touch point'); return; }

      const x = t.clientX, y = t.clientY;
      const now = Date.now();
      const dt = now - lastTapTime;
      const dx = x - lastTapX, dy = y - lastTapY;
      const dist2 = dx * dx + dy * dy;
      const withinTime = dt > 0 && dt <= DBL_TAP_MAX_DELAY;
      const withinDist = dist2 <= DBL_TAP_MAX_DIST * DBL_TAP_MAX_DIST;
      const sameTarget = e.target === lastTapTarget;


      if (withinTime && withinDist && sameTarget) {
        // Confirmed double-tap
        console.log('[touchend] double-tap confirmed');
        const r = getWordRangeAtPoint(x, y);
        if (r) {
          selectRange(r);
          triggerSelectionHandlers();
          e.preventDefault(); // stop native
        }
        // reset
        lastTapTime = 0;
        lastTapTarget = null;
      } else {
        // record as first tap
        lastTapTime = now;
        lastTapX = x;
        lastTapY = y;
        lastTapTarget = e.target;
      }
    } catch (err) {
      console.error('[touchend] error', err);
    }
  }, { passive: false });

  // Send to translator on selection
  document.addEventListener('mouseup', (e) => {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText && window.parent && window.parent.sendToTranslator) {
      window.parent.sendToTranslator(selectedText);
    }
  });

  // Send to translator on left click on .sentence
  document.addEventListener('click', (e) => {
    const selectedText = window.getSelection().toString().trim();

    // Only if no selection, check if clicked on .sentence
    if (!selectedText) {
      const sentenceElement = e.target.closest('.sentence');
      if (sentenceElement && window.parent && window.parent.sendToTranslator) {
        const text = sentenceElement.textContent.trim();
        window.parent.sendToTranslator(text);
      }
    }
  });

  // Context menu for sending selection to parent editors
  document.addEventListener('contextmenu', (e) => {
    let selectedText = window.getSelection().toString().trim();

    // If no selection, check if clicked on a .sentence element
    if (!selectedText) {
      const sentenceElement = e.target.closest('.sentence');
      if (sentenceElement) {
        selectedText = sentenceElement.textContent.trim();
      }
    }

    if (selectedText && window.parent && window.parent.showIframeSelectionMenu) {
      e.preventDefault();
      // Send message to parent with selection and coordinates
      window.parent.showIframeSelectionMenu(e.clientX, e.clientY, selectedText);
    }
  });

})();
