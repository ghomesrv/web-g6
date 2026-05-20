// =========================================================
// Global Variables & DOM Elements
// =========================================================
const MIN_DISKS = 3; // Minimum number of disks (can be changed easily)
const MAX_DISKS = 5; // Maximum number of disks (can be changed easily)

let numDisks = 0; // Current number of disks in the game
let movesMade = 0; // Tracks user's moves
let requiredMoves = 0; // Optimal moves (2^n - 1)
let gameWon = false; // Flag to check if the game is won
let selectedDisk = null; // Stores the disk currently clicked/selected by the user
let messageTimeoutId = null; // NEW: To store the ID of the message timeout

// Get references to DOM elements
const pegs = [
    document.getElementById('peg1'),
    document.getElementById('peg2'),
    document.getElementById('peg3')
];
const numDisksDisplay = document.getElementById('numDisksDisplay');
const requiredMovesDisplay = document.getElementById('requiredMovesDisplay');
const userMovesDisplay = document.getElementById('userMovesDisplay');
const resetButton = document.getElementById('resetButton');
const messageDisplay = document.getElementById('messageDisplay');

// Data structure to represent the disks on each peg
// Each sub-array will hold disk elements, ordered from bottom to top
const pegState = [[], [], []]; // pegState[0] for peg1, pegState[1] for peg2, pegState[2] for peg3

// =========================================================
// Helper Functions
// =========================================================

/**
 * Displays a message to the user for a short duration.
 * @param {string} msg The message to display.
 * @param {boolean} isError If true, the message will be styled as an error.
 */
function showMessage(msg, isError = false) {
    // Clear any existing message timeout before setting a new one
    if (messageTimeoutId) {
        clearTimeout(messageTimeoutId);
    }

    messageDisplay.textContent = msg;
    // We'll set the text shadow dynamically as well for consistency
    messageDisplay.style.color = isError ? '#e74c3c' : '#2ecc71'; // Red for error, green for success
    messageDisplay.style.textShadow = '1px 1px 3px rgba(0,0,0,0.7)'; // Default shadow for messages

    // Set a new timeout and store its ID
    messageTimeoutId = setTimeout(() => {
        // Only clear the message if the game isn't won.
        // The win message will be managed separately and persist.
        if (!gameWon) {
            messageDisplay.textContent = '';
            messageTimeoutId = null; // Clear the stored ID once the message is cleared
        }
    }, 2000); // Clear message after 2 seconds
}

/**
 * Updates the display elements with current game info.
 */
function updateDisplay() {
    numDisksDisplay.textContent = numDisks;
    requiredMovesDisplay.textContent = requiredMoves;
    userMovesDisplay.textContent = movesMade;
}

/**
 * Generates a random integer within a specified range (inclusive).
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Calculates the bottom position for a disk based on its stack index.
 * Disks sit on top of each other. The base is 15px.
 * Each disk is 30px high.
 * @param {number} stackIndex The index of the disk from the bottom of the stack (0-indexed).
 * @returns {number} The 'bottom' CSS value in pixels.
 */
function getDiskBottomPosition(stackIndex) {
    return 15 + (stackIndex * 30); // 15px for peg-base + (index * diskHeight)
}


// =========================================================
// Game Initialization
// =========================================================

/**
 * Initializes or resets the game.
 */
function initGame() {
    // Clear any pending message timeout (important for when resetting from a win state)
    if (messageTimeoutId) {
        clearTimeout(messageTimeoutId);
        messageTimeoutId = null;
    }

    // Reset game state
    movesMade = 0;
    gameWon = false;
    selectedDisk = null;
    messageDisplay.textContent = ''; // Clear any previous messages immediately on reset
    messageDisplay.style.textShadow = ''; // Clear text shadow for initial empty state

    // Re-enable peg click listeners if they were disabled on win
    pegs.forEach(peg => peg.addEventListener('click', handlePegClick));

    // Clear all disks from pegs visually and from pegState arrays
    pegs.forEach(peg => {
        // Remove existing disk elements
        Array.from(peg.children).forEach(child => {
            if (child.classList.contains('disk')) {
                child.remove();
            }
        });
    });
    pegState[0] = [];
    pegState[1] = [];
    pegState[2] = [];

    // Randomly determine number of disks
    numDisks = getRandomInt(MIN_DISKS, MAX_DISKS);
    requiredMoves = Math.pow(2, numDisks) - 1;

    // Create disks and place them on the first peg
    for (let i = numDisks; i >= 1; i--) { // Start from largest disk (numDisks) down to smallest (1)
        const disk = document.createElement('div');
        disk.classList.add('disk');
        disk.dataset.size = i; // Store disk size for validation (larger number = larger disk)
        disk.id = `disk-${i}`; // Unique ID for each disk

        // Calculate width based on size. Larger disks are wider.
        // We can make disk 1 (smallest) a fixed width, and larger disks progressively wider.
        // Example: disk 1 = 60px, disk 2 = 80px, ..., disk 5 = 140px
        const diskWidth = 60 + (i - 1) * 20; // 60px for size 1, +20px for each subsequent size
        disk.style.width = `${diskWidth}px`;
        disk.style.left = `calc(50% - ${diskWidth / 2}px)`; // Center the disk on the peg

        // Position the disk on the stack
        disk.style.bottom = `${getDiskBottomPosition(numDisks - i)}px`; // Adjust index for bottom-up stacking

        pegs[0].appendChild(disk); // Add disk to the first peg visually
        pegState[0].push(disk); // Add disk element to the pegState array
    }

    // Update display with initial values
    updateDisplay();
}

// =========================================================
// Disk Movement Logic
// =========================================================

/**
 * Handles clicks on pegs to select/move disks.
 * @param {MouseEvent} event The click event.
 */
function handlePegClick(event) {
    if (gameWon) {
        // If game is already won, clear any pending message timeout
        if (messageTimeoutId) {
            clearTimeout(messageTimeoutId);
            messageTimeoutId = null;
        }
        // Then display the "Game already won" message, which will now have its own timeout
        showMessage("Game already won! Click Reset to play again.", true);
        return;
    }

    const clickedPeg = event.currentTarget; // The peg element that was clicked
    const pegIndex = pegs.indexOf(clickedPeg); // Which peg (0, 1, or 2)

    // Scenario 1: No disk is currently selected
    if (!selectedDisk) {
        // Check if there's a disk on this peg to select
        if (pegState[pegIndex].length > 0) {
            selectedDisk = pegState[pegIndex][pegState[pegIndex].length - 1]; // Get the topmost disk
            selectedDisk.classList.add('selected'); // Highlight it
            // Store which peg this disk came from
            selectedDisk.dataset.fromPeg = pegIndex;
            showMessage(`Disk ${selectedDisk.dataset.size} selected. Now click a destination peg.`);
        } else {
            showMessage("No disk to select on this peg.", true);
        }
    }
    // Scenario 2: A disk is selected, and user clicked a destination peg
    else {
        const fromPegIndex = parseInt(selectedDisk.dataset.fromPeg);

        // If the user clicked the peg the disk is already on, deselect it
        if (fromPegIndex === pegIndex) {
            selectedDisk.classList.remove('selected');
            selectedDisk = null;
            showMessage("Disk deselected.");
            return;
        }

        // Validate the move
        const topDiskOnTargetPeg = pegState[pegIndex].length > 0 ? pegState[pegIndex][pegState[pegIndex].length - 1] : null;
        const selectedDiskSize = parseInt(selectedDisk.dataset.size);

        // Rule: A larger disk cannot be placed on a smaller disk
        if (topDiskOnTargetPeg && selectedDiskSize > parseInt(topDiskOnTargetPeg.dataset.size)) {
            showMessage("Cannot place a larger disk on a smaller disk!", true);
            // Keep the disk selected, user needs to choose another valid target
            return;
        }

        // --- Valid Move! ---
        movesMade++; // Increment moves
        updateDisplay();

        // 1. Remove disk from source peg's state
        const movedDisk = pegState[fromPegIndex].pop();

        // 2. Add disk to destination peg's state
        pegState[pegIndex].push(movedDisk);

        // 3. Visually move the disk
        // Remove from old parent
        pegs[fromPegIndex].removeChild(movedDisk);
        // Add to new parent
        pegs[pegIndex].appendChild(movedDisk);

        // Update visual position (bottom property)
        movedDisk.style.bottom = `${getDiskBottomPosition(pegState[pegIndex].length - 1)}px`;
        movedDisk.style.left = `calc(50% - ${movedDisk.offsetWidth / 2}px)`; // Re-center on the new peg

        // Remove selection highlight and reset selectedDisk
        movedDisk.classList.remove('selected');
        selectedDisk = null;
        
        // Check for win condition BEFORE showing "Move successful!",
        // so the win message takes precedence and cancels the "Move successful!" timeout.
        checkWinCondition(); 

        // Only show "Move successful!" if the game hasn't been won by this move
        if (!gameWon) {
            showMessage("Move successful!");
        }
    }
}

/**
 * Checks if the game has been won.
 * The game is won if all disks are on the last peg (peg3).
 */
function checkWinCondition() {
    // Check if the third peg contains all disks and the count matches initial numDisks
    if (pegState[2].length === numDisks) {
        gameWon = true;

        // Clear any existing message timeout before displaying the win message
        if (messageTimeoutId) {
            clearTimeout(messageTimeoutId);
            messageTimeoutId = null;
        }

        // Display the win message directly with custom styling
        messageDisplay.textContent = `Congratulations! You won in ${movesMade} moves. Optimal moves: ${requiredMoves}.`;
        messageDisplay.style.color = '#f1c40f'; // Brighter color for win message (adjust as per your CSS)
        messageDisplay.style.textShadow = '1px 1px 5px rgba(0,0,0,0.8)'; // Ensure visibility

        // Disable further moves
        pegs.forEach(peg => peg.removeEventListener('click', handlePegClick));
    }
}


// =========================================================
// Event Listeners
// =========================================================

// Add click listeners to each peg
pegs.forEach(peg => {
    peg.addEventListener('click', handlePegClick);
});

// Add click listener to the reset button
resetButton.addEventListener('click', initGame);

// =========================================================
// Initial Game Setup on Load
// =========================================================
initGame(); // Call initGame once when the script loads to set up the first game