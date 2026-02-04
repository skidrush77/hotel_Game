// Game Configuration
// Game Configuration
const SHAPES = [
    'assets/new_object_kettle.png',
    'assets/object_box_03.png',
    'assets/spa_amenities_red.png',
    'assets/Parts-plate_full.png',
    'assets/new_object_minibar.png',
    'assets/new_object_toaster.png'
];
const DOCK_SIZE = 7;
const SHELF_COUNT = 6;
const ITEMS_PER_SHELF = 4; // Should be such that total items % 3 == 0

// Game State
let shelves = []; // Array of arrays containing item strings (paths)
let dock = [];    // Array of strings (paths)
let score = 0;
let isGameOver = false;
let idleTimer = null;

// DOM Elements
const shelvesContainer = document.getElementById('shelves-container');
const dockSlots = document.getElementById('dock-slots');
const scoreEl = document.getElementById('score');
const gameApp = document.getElementById('game-app');
const tutorialHand = document.getElementById('tutorial-hand');
const overlay = document.getElementById('overlay');
const msgTitle = document.getElementById('game-msg-title');
const msgBox = document.getElementById('message-box');

// Audio Context (Mock for now, visual only requested via text descriptions, 
// using 'juice' visually as requested)

// Init
function initGame() {
    score = 0;
    isGameOver = false;
    dock = [];
    shelves = [];
    scoreEl.innerText = score;
    overlay.classList.add('hidden');
    tutorialHand.classList.add('hidden');

    // Generate Level
    // Total items need to be divisible by 3 and usually consist of sets of 3
    let totalItems = SHELF_COUNT * ITEMS_PER_SHELF;
    // ensure divisible by 3
    while (totalItems % 3 !== 0) totalItems++;

    let allItems = [];
    for (let i = 0; i < totalItems / 3; i++) {
        const type = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        allItems.push(type, type, type);
    }

    // Shuffle
    allItems.sort(() => Math.random() - 0.5);

    // Distribute to shelves
    let itemIdx = 0;
    for (let i = 0; i < SHELF_COUNT; i++) {
        let shelf = [];
        let count = ITEMS_PER_SHELF;
        // Make last shelf take remaining if any unevenness
        if (i === SHELF_COUNT - 1) count = allItems.length - itemIdx;

        for (let j = 0; j < count; j++) {
            if (itemIdx < allItems.length) {
                shelf.push(allItems[itemIdx++]);
            }
        }
        shelves.push(shelf);
    }

    renderShelves();
    renderDock();
    resetIdleTimer();
}

// Rendering
// Rendering
function renderShelves() {
    shelvesContainer.innerHTML = '';
    shelves.forEach((shelfItems, shelfIndex) => {
        const shelfEl = document.createElement('div');
        shelfEl.classList.add('shelf');

        shelfItems.forEach((item, itemIndex) => {
            const itemEl = document.createElement('div');
            itemEl.classList.add('item');

            if (item) {
                const img = document.createElement('img');
                img.src = item;
                img.alt = 'Hotel Item';
                itemEl.appendChild(img);
                itemEl.onclick = (e) => onItemClick(e, shelfIndex, itemIndex, item);
            } else {
                // Placeholder
                itemEl.style.cursor = 'default';
                itemEl.style.opacity = '0';
                itemEl.style.pointerEvents = 'none';
            }

            shelfEl.appendChild(itemEl);
        });

        shelvesContainer.appendChild(shelfEl);
    });
}

function renderDock() {
    dockSlots.innerHTML = '';

    // Fill active slots
    dock.forEach((item, index) => {
        const slot = document.createElement('div');
        slot.classList.add('slot');
        const itemEl = document.createElement('div');
        itemEl.classList.add('item');

        const img = document.createElement('img');
        img.src = item;
        img.alt = 'Dock Item';

        itemEl.appendChild(img);
        // Animation when entering dock
        itemEl.style.animation = 'scaleIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        slot.appendChild(itemEl);
        dockSlots.appendChild(slot);
    });

    // Fill empty slots
    for (let i = dock.length; i < DOCK_SIZE; i++) {
        const slot = document.createElement('div');
        slot.classList.add('slot');
        dockSlots.appendChild(slot);
    }
}

// Logic
// Logic
function onItemClick(event, shelfIndex, itemIndex, item) {
    if (isGameOver) return;
    if (dock.length >= DOCK_SIZE) return;

    // Visual Juice: Squash
    const target = event.target.closest('.item');
    if (target) target.classList.add('squash');

    // Logic: Move from shelf to dock
    // Use timeout to let squash play slightly or just move immediately? 
    // Immediate usually feels snappier for this genre

    resetIdleTimer();

    // Remove from shelf (Replace with null to keep slot)
    shelves[shelfIndex][itemIndex] = null;

    // Add to dock
    // Special logic: if same item exists in dock, place next to it? 
    // Usually these games auto-sort in dock or just append.
    // Let's implement auto-grouping for better UX (like Tile Master)
    // Find last index of this item type in dock
    let insertIdx = dock.lastIndexOf(item);
    if (insertIdx !== -1) {
        dock.splice(insertIdx + 1, 0, item);
    } else {
        dock.push(item);
    }

    renderShelves();
    renderDock();
    checkMatches();

    // Check if shelf empty (for win condition later, but win is essentially all clear)
    checkWinCondition();
}

function checkMatches() {
    // Check for 3 consecutive items
    if (dock.length < 3) return;

    let matchFound = false;
    for (let i = 0; i <= dock.length - 3; i++) {
        if (dock[i] === dock[i + 1] && dock[i] === dock[i + 2]) {
            // Match found!
            const matchedItem = dock[i];

            // Wait a tiny bit to show them grouped, then remove
            isGameOver = true; // Lock input briefly
            setTimeout(() => {
                // Particles
                spawnParticles(window.innerWidth / 2, window.innerHeight - 80, '#D4AF37'); // Center dock area approx

                // Shake Screen
                gameApp.classList.add('shake');
                setTimeout(() => gameApp.classList.remove('shake'), 500);

                // Remove 3 items
                dock.splice(i, 3);
                score += 100;
                scoreEl.innerText = score;
                isGameOver = false; // Unlock
                renderDock();
                checkWinCondition(); // Re-check win after clearing
            }, 300);

            matchFound = true;
            break; // Handle one match at a time usually
        }
    }

    if (!matchFound && dock.length >= DOCK_SIZE) {
        triggerGameOver();
    }
}

function checkWinCondition() {
    // Win if shelves are empty AND dock is empty
    // Check if all shelves items are null
    const shelvesEmpty = shelves.every(s => s.every(item => item === null));
    if (shelvesEmpty && dock.length === 0) {
        setTimeout(() => {
            msgTitle.innerText = "Stage Clear! - Royal Hotel";
            msgBox.querySelector('p').innerText = "Score: " + score;
            overlay.classList.remove('hidden');
        }, 500);
    }
}

function triggerGameOver() {
    isGameOver = true;
    setTimeout(() => {
        msgTitle.innerText = "Game Over";
        msgBox.querySelector('p').innerText = "The dock is full!";
        overlay.classList.remove('hidden');
    }, 500);
}

// Effects
function spawnParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
        const p = document.createElement('div');
        p.classList.add('particle');
        p.style.backgroundColor = color;
        p.style.left = x + 'px';
        p.style.top = y + 'px';

        // Random direction
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 100 + 50;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;

        p.style.setProperty('--tx', `${tx}px`);
        p.style.setProperty('--ty', `${ty}px`);

        document.body.appendChild(p);

        setTimeout(() => p.remove(), 800);
    }
}

// Idle Logic (Tutorial Hand)
function resetIdleTimer() {
    tutorialHand.classList.add('hidden');
    if (idleTimer) clearTimeout(idleTimer);

    if (isGameOver) return;

    idleTimer = setTimeout(() => {
        showTutorialHand();
    }, 3000);
}

function showTutorialHand() {
    // Find first clickable item
    const firstShelf = shelvesContainer.querySelector('.shelf');
    if (firstShelf) {
        const firstItem = firstShelf.querySelector('.item');
        if (firstItem) {
            const rect = firstItem.getBoundingClientRect();
            tutorialHand.style.left = (rect.left + 10) + 'px';
            tutorialHand.style.top = (rect.top + 10) + 'px';
            tutorialHand.classList.remove('hidden');
        }
    }
}

document.addEventListener('click', () => {
    // Global click resets timer too, but specific actions handle it better
    // resetIdleTimer(); 
});

// Start
initGame();
