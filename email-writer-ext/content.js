console.log("Email Writer Extension - Content Script Loaded");

function createAIButtonWithMenu() {
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.display = 'inline-flex';
    container.style.alignItems = 'center';
    container.style.marginRight = '6px'; // Space between AI button and Send button

    // Main AI Reply button (exact Gmail Send button style)
    const mainButton = document.createElement('div');
    mainButton.className = 'T-I J-J5-Ji aoO v7 T-I-atl L3 ai-main-button';
    mainButton.style.display = 'flex';
    mainButton.style.alignItems = 'center';
    mainButton.style.justifyContent = 'center';
    mainButton.style.position = 'relative';
    mainButton.style.cursor = 'pointer';
    mainButton.style.userSelect = 'none';
    mainButton.style.height = '36px'; // Match Gmail Send button
    mainButton.style.fontSize = '13px';
    mainButton.style.fontWeight = '500';
    mainButton.style.padding = '0 16px'; // Matches Gmail Send padding
    mainButton.style.lineHeight = '36px';
    mainButton.style.borderRadius = '4px';
    mainButton.style.backgroundColor = '#1a73e8';
    mainButton.style.color = '#fff';
    mainButton.style.minWidth = '80px';
    mainButton.style.boxSizing = 'border-box';
    mainButton.innerHTML = 'AI Reply <span style="margin-left:6px;font-size:12px;">▼</span>';

    // Dropdown menu (hidden by default)
    const dropdown = document.createElement('div');
    dropdown.style.position = 'absolute';
    dropdown.style.top = '38px'; // Slightly below button
    dropdown.style.right = '0';
    dropdown.style.background = '#fff';
    dropdown.style.border = '1px solid #dadce0';
    dropdown.style.borderRadius = '4px';
    dropdown.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
    dropdown.style.padding = '6px';
    dropdown.style.display = 'none';
    dropdown.style.zIndex = '1000';
    dropdown.style.minWidth = '150px';
    dropdown.style.fontSize = '12px';

    // Tone selector inside dropdown
    const toneSelect = document.createElement('select');
    toneSelect.style.width = '100%';
    toneSelect.style.padding = '4px';
    toneSelect.style.marginBottom = '6px';
    toneSelect.style.border = '1px solid #dadce0';
    toneSelect.style.borderRadius = '3px';
    toneSelect.style.fontSize = '12px';

    const tones = ['Professional', 'Positive', 'Negative', 'Friendly', 'Casual'];
    tones.forEach(tone => {
        const option = document.createElement('option');
        option.value = tone.toLowerCase();
        option.textContent = tone;
        toneSelect.appendChild(option);
    });

    // Generate AI Reply button inside dropdown
    const generateBtn = document.createElement('button');
    generateBtn.innerText = 'Generate AI Reply';
    generateBtn.style.width = '100%';
    generateBtn.style.padding = '6px';
    generateBtn.style.border = 'none';
    generateBtn.style.borderRadius = '3px';
    generateBtn.style.background = '#1a73e8';
    generateBtn.style.color = '#fff';
    generateBtn.style.cursor = 'pointer';
    generateBtn.style.fontSize = '12px';

    // Toggle dropdown when clicking main button
    mainButton.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });

    // Generate AI reply from dropdown
    generateBtn.addEventListener('click', async () => {
        try {
            generateBtn.innerText = 'Generating...';
            generateBtn.disabled = true;

            const emailContent = getEmailContent();
            const selectedTone = toneSelect.value || 'professional';

            const response = await fetch('http://localhost:8080/api/email/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailContent, tone: selectedTone })
            });

            if (!response.ok) throw new Error('API Request Failed');

            const generatedReply = await response.text();
            const composeBox = document.querySelector('[role="textbox"][g_editable="true"]');

            if (composeBox) {
                composeBox.focus();
                document.execCommand('insertText', false, generatedReply);
            }

            // Close dropdown after generation
            dropdown.style.display = 'none';
        } catch (err) {
            console.error(err);
            alert('Failed to generate reply');
        } finally {
            generateBtn.innerText = 'Generate AI Reply';
            generateBtn.disabled = false;
        }
    });

    dropdown.appendChild(toneSelect);
    dropdown.appendChild(generateBtn);
    container.appendChild(mainButton);
    container.appendChild(dropdown);

    // Close dropdown if clicked outside
    document.addEventListener('click', (event) => {
        if (!dropdown.contains(event.target) && !mainButton.contains(event.target)) {
            dropdown.style.display = 'none';
        }
    });

    return container;
}

// Get email content
function getEmailContent() {
    const selectors = ['.h7', '.a3s.aiL', '.gmail_quote', '[role="presentation"]'];
    for (const selector of selectors) {
        const content = document.querySelector(selector);
        if (content) return content.innerText.trim();
    }
    return '';
}

// Find Gmail compose toolbar
function findComposeToolbar() {
    const selectors = ['.btC', '.aDh', '[role="toolbar"]', '.gU.Up'];
    for (const selector of selectors) {
        const toolbar = document.querySelector(selector);
        if (toolbar) return toolbar;
    }
    return null;
}

// Inject AI button at the beginning of toolbar
function injectAIButton() {
    const existing = document.querySelector('.ai-button-container');
    if (existing) existing.remove();

    const toolbar = findComposeToolbar();
    if (!toolbar) return;

    const buttonMenu = createAIButtonWithMenu();
    buttonMenu.classList.add('ai-button-container');

    // Insert at the start of toolbar (before Send)
    toolbar.insertBefore(buttonMenu, toolbar.firstChild);
}

// Observe Gmail DOM changes for new compose windows
const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
        const addedNodes = Array.from(mutation.addedNodes);
        const hasCompose = addedNodes.some(node =>
            node.nodeType === Node.ELEMENT_NODE &&
            (node.matches('.aDh, .btC, [role="dialog"]') || node.querySelector('.aDh, .btC, [role="dialog"]'))
        );
        if (hasCompose) setTimeout(injectAIButton, 500);
    }
});

observer.observe(document.body, { childList: true, subtree: true });
