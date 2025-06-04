// Inject CSS dynamically


const style = document.createElement('style');
style.textContent = `
    body {
        background-color: #111;
        color: #ffffaa;
        margin: 30px;
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
    padding-right: 50px;         /* Prevent text from overlapping the button */
}

.speak-paragraph-button {
    position: absolute;          /* Absolutely position it in the top-right corner */
    top: 0;
    right: 0;
    margin: 5px;                 /* Some spacing from the edges */
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

// Highlight text logic
document.addEventListener('DOMContentLoaded', () => {
    const paragraphs = document.querySelectorAll('p');
    const indexTooltip = document.createElement('div');
    indexTooltip.className = 'paragraph-index-tooltip';
    document.body.appendChild(indexTooltip);

    paragraphs.forEach((paragraph, index) => {
 
        paragraph.id = `p${index + 1}`; 

        // 1) Protect "т. е." (in any spacing you expect)
        paragraph.innerHTML = paragraph.innerHTML
            // This example matches “т. e.” with optional spaces:
            // If you have exactly "т. е." always, just use /т\. е\./g
            // Or add more variations: /т\. ?е\./g
            .replace(/т\.[\s\u00A0\u202F]?е\./gi, '%%TE%%')

        // 2) Insert <br> for punctuation
        paragraph.innerHTML = paragraph.innerHTML.replace(
            /([.!?…])(?=(<\/[^>]+>|\s|$))/g,
            '$1<br><br class="br-small">'
        );
 
         // 3) Restore the protected text
        paragraph.innerHTML = paragraph.innerHTML.replace(/%%TE%%/g, 'т. е.');
        
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
                console.log("speak", paragraphText)
					const utterance = new SpeechSynthesisUtterance(paragraphText);
					utterance.lang = 'ru-RU';
					utterance.rate = 1.2; // 1.0 is normal, max is ~2.0 (varies by browser/voice)
                    utterance.voice = russianVoice;

					window.speechSynthesis.speak(utterance);
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
									navigator.clipboard.writeText(selectedText).then(() => {
											console.log(`Copied to clipboard: ${selectedText}`);
									}).catch(err => {
											console.error('Failed to copy text to clipboard:', err);
									});
									
								}
						}
						previousTranslation = selectedText

					
						// Fetch translation 
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
});


document.addEventListener('keydown', (event) => {
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
});



let autoScrollFlag = 0 ;




setInterval(function(){
    if(autoScrollFlag){
        window.scrollBy({ top: 1, behavior: 'smooth' });
    }
},300)