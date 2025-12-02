const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Use nearest neighbor scaling for crisp pixel art
ctx.imageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled = false;
ctx.msImageSmoothingEnabled = false;

// Canvas dimensions
canvas.width = 1200;
canvas.height = 800;

// Card dimensions
const CARD_WIDTH = 100;
const CARD_HEIGHT = 140;
const CARD_SPACING = 20;

// Deck position (below center card)
const DECK_X = canvas.width / 2 - CARD_WIDTH / 2;
const DECK_Y = canvas.height / 2 + CARD_HEIGHT / 2 + 30;

// Game state
const game = {
  state: 'INITIAL', // INITIAL, DEAL, SELECT, DRAW, RESULT, ANIMATING
  balance: 200,
  bet: 1,
  deck: [],
  hand: [],
  selectedCards: new Set(),
  winAmount: 0,
  winningHand: null,
  animatingCards: []
};

// Images
const images = {
  logo: null,
  cardBack: null,
  cardFront: null
};

// Poker hand payouts
const PAYOUTS = {
  'Royal Flush': 250,
  'Straight Flush': 50,
  'Four of a Kind': 25,
  'Full House': 9,
  'Flush': 6,
  'Straight': 4,
  'Three of a Kind': 3,
  'Two Pair': 2,
  'Jacks or Better': 1
};

// Load images
function loadImages() {
  return new Promise((resolve) => {
    let loaded = 0;
    const total = 3;
    
    const checkLoaded = () => {
      loaded++;
      if (loaded === total) resolve();
    };
    
    images.logo = new Image();
    images.logo.src = 'sprites/kiro-logo.png';
    images.logo.onload = checkLoaded;
    
    images.cardBack = new Image();
    images.cardBack.src = 'sprites/cards/Backsides/LightBricks.png';
    images.cardBack.onload = checkLoaded;
    
    images.cardFront = new Image();
    images.cardFront.src = 'sprites/cards/ClassicCards.png';
    images.cardFront.onload = checkLoaded;
  });
}

// Create deck
function createDeck() {
  const suits = ['hearts', 'spades', 'clubs', 'diamonds'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck = [];
  
  for (let suit of suits) {
    for (let i = 0; i < ranks.length; i++) {
      // Value for poker hand evaluation (Ace = 14)
      let value = i + 1;
      if (ranks[i] === 'A') value = 14;
      
      deck.push({
        suit,
        rank: ranks[i],
        value: value,
        spriteX: i,
        spriteY: suits.indexOf(suit)
      });
    }
  }
  
  return shuffle(deck);
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Draw card sprite
function drawCard(card, x, y, faceUp = true, selected = false) {
  ctx.save();
  
  if (selected) {
    ctx.shadowColor = '#790ECB';
    ctx.shadowBlur = 20;
    ctx.translate(0, -10);
  }
  
  if (faceUp && card) {
    // Draw from sprite sheet - 311x143 atlas, 13x4 grid with 1px gaps
    // Each card is approximately 23x35 pixels
    const spriteWidth = 23;
    const spriteHeight = 35;
    const gap = 1;
    
    const srcX = card.spriteX * (spriteWidth + gap);
    const srcY = card.spriteY * (spriteHeight + gap);
    
    ctx.drawImage(
      images.cardFront,
      srcX,
      srcY,
      spriteWidth,
      spriteHeight,
      x, y, CARD_WIDTH, CARD_HEIGHT
    );
  } else {
    // Draw card back
    ctx.drawImage(images.cardBack, x, y, CARD_WIDTH, CARD_HEIGHT);
  }
  
  ctx.restore();
}

// Draw payout table
function drawPayoutTable() {
  const hands = Object.keys(PAYOUTS);
  const leftX = 50;
  const rightX = canvas.width - 200;
  const startY = 150;
  const spacing = 60;
  
  ctx.font = 'bold 16px Arial';
  
  hands.forEach((hand, index) => {
    const x = index < 5 ? leftX : rightX;
    const y = startY + (index % 5) * spacing;
    const payout = PAYOUTS[hand];
    const isWinner = game.winningHand === hand;
    
    // Highlight winning hand
    if (isWinner) {
      ctx.fillStyle = '#790ECB';
      ctx.fillRect(x - 10, y - 20, 180, 35);
    }
    
    ctx.fillStyle = isWinner ? '#ffffff' : '#cccccc';
    ctx.fillText(hand, x, y);
    ctx.fillText(`$${payout * game.bet}`, x + 120, y);
  });
}

// Draw UI
function drawUI() {
  // Logo
  if (images.logo.complete) {
    ctx.drawImage(images.logo, canvas.width / 2 - 50, 20, 100, 100);
  }
  
  // Balance
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.fillText(`Balance: $${game.balance}`, canvas.width / 2 - 80, canvas.height - 80);
  
  // Bet button
  drawButton(canvas.width / 2 - 200, canvas.height - 50, 120, 40, `Bet: $${game.bet}`, '#4a4a4a');
  
  // Play/Next button
  let buttonText = 'Play';
  if (game.state === 'SELECT') buttonText = 'Roll';
  if (game.state === 'RESULT') buttonText = 'Next';
  
  drawButton(canvas.width / 2 + 80, canvas.height - 50, 120, 40, buttonText, '#790ECB');
  
  // Instructions
  if (game.state === 'SELECT') {
    ctx.fillStyle = '#790ECB';
    ctx.font = '18px Arial';
    ctx.fillText('Click cards to HOLD', canvas.width / 2 - 80, canvas.height - 120);
  }
  
  // Win message
  if (game.state === 'RESULT' && game.winAmount > 0) {
    ctx.fillStyle = '#790ECB';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(`${game.winningHand}!`, canvas.width / 2 - 100, 200);
    ctx.fillText(`Win: $${game.winAmount}`, canvas.width / 2 - 80, 240);
  }
  
  // Loss message
  if (game.state === 'RESULT' && game.winAmount === 0) {
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 32px Arial';
    ctx.fillText('No Win', canvas.width / 2 - 60, 200);
    ctx.fillStyle = '#ff6666';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`Lost: -$${game.bet}`, canvas.width / 2 - 60, 240);
  }
}

function drawButton(x, y, width, height, text, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(text, x + width / 2, y + height / 2 + 6);
  ctx.textAlign = 'left';
}

// Draw deck
function drawDeck() {
  if (game.deck.length > 0) {
    // Draw deck stack
    for (let i = 0; i < Math.min(3, game.deck.length); i++) {
      ctx.drawImage(images.cardBack, DECK_X + i * 2, DECK_Y + i * 2, CARD_WIDTH, CARD_HEIGHT);
    }
    
    // Draw deck count
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`${game.deck.length}`, DECK_X + CARD_WIDTH / 2 - 10, DECK_Y + CARD_HEIGHT + 25);
  }
}

// Draw hand
function drawHand() {
  const startX = (canvas.width - (5 * CARD_WIDTH + 4 * CARD_SPACING)) / 2;
  const y = canvas.height / 2 - CARD_HEIGHT / 2;
  
  // Draw card outlines when no hand is dealt
  if (game.hand.length === 0 && game.animatingCards.length === 0) {
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    for (let i = 0; i < 5; i++) {
      const x = startX + i * (CARD_WIDTH + CARD_SPACING);
      ctx.strokeRect(x, y, CARD_WIDTH, CARD_HEIGHT);
    }
    ctx.setLineDash([]);
  } else if (game.state !== 'ANIMATING' && game.state !== 'ANIMATING_ROLL') {
    // Only draw static hand when not animating
    game.hand.forEach((card, index) => {
      const x = startX + index * (CARD_WIDTH + CARD_SPACING);
      const selected = game.selectedCards.has(index);
      drawCard(card, x, y, true, selected);
    });
  } else if (game.state === 'ANIMATING_ROLL') {
    // During roll animation, draw only the held cards
    game.hand.forEach((card, index) => {
      const isBeingReplaced = game.animatingCards.some(anim => {
        const animIndex = (anim.endX - startX) / (CARD_WIDTH + CARD_SPACING);
        return Math.round(animIndex) === index;
      });
      
      if (!isBeingReplaced) {
        const x = startX + index * (CARD_WIDTH + CARD_SPACING);
        const selected = game.selectedCards.has(index);
        drawCard(card, x, y, true, selected);
      }
    });
  }
  
  // Draw animating cards
  game.animatingCards.forEach(anim => {
    const scaleX = Math.abs(Math.cos(anim.flipProgress * Math.PI));
    ctx.save();
    ctx.translate(anim.x + CARD_WIDTH / 2, anim.y + CARD_HEIGHT / 2);
    ctx.scale(scaleX, 1);
    ctx.translate(-CARD_WIDTH / 2, -CARD_HEIGHT / 2);
    
    if (anim.flipProgress < 0.5) {
      ctx.drawImage(images.cardBack, 0, 0, CARD_WIDTH, CARD_HEIGHT);
    } else {
      const card = anim.card;
      const spriteWidth = 23;
      const spriteHeight = 35;
      const gap = 1;
      const srcX = card.spriteX * (spriteWidth + gap);
      const srcY = card.spriteY * (spriteHeight + gap);
      ctx.drawImage(images.cardFront, srcX, srcY, spriteWidth, spriteHeight, 0, 0, CARD_WIDTH, CARD_HEIGHT);
    }
    
    ctx.restore();
  });
}

// Main render
function render() {
  // Ensure image smoothing stays disabled
  ctx.imageSmoothingEnabled = false;
  
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  drawPayoutTable();
  drawDeck();
  drawHand();
  drawUI();
}

// Animation loop
let lastTime = 0;
function gameLoop(timestamp) {
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;
  
  // Update animations
  if (game.animatingCards.length > 0) {
    let allComplete = true;
    game.animatingCards.forEach(anim => {
      if (anim.progress < 1) {
        anim.progress += deltaTime / anim.duration;
        anim.progress = Math.min(anim.progress, 1);
        
        const t = anim.progress;
        
        // Move phase: 0 to 0.4 (fast movement)
        if (t < 0.4) {
          const moveT = t / 0.4;
          const eased = 1 - Math.pow(1 - moveT, 3);
          anim.x = anim.startX + (anim.endX - anim.startX) * eased;
          anim.y = anim.startY + (anim.endY - anim.startY) * eased;
          anim.flipProgress = 0;
        } 
        // Flip phase: 0.4 to 1.0
        else {
          anim.x = anim.endX;
          anim.y = anim.endY;
          const flipT = (t - 0.4) / 0.6;
          anim.flipProgress = flipT;
        }
        
        allComplete = false;
      }
    });
    
    if (allComplete) {
      game.animatingCards = [];
      if (game.state === 'ANIMATING') {
        game.state = 'SELECT';
      } else if (game.state === 'ANIMATING_ROLL') {
        // Evaluate hand after roll animation
        game.winningHand = evaluateHand(game.hand);
        game.winAmount = game.winningHand ? PAYOUTS[game.winningHand] * game.bet : 0;
        game.state = 'RESULT';
      }
    }
  }
  
  render();
  requestAnimationFrame(gameLoop);
}

// Start animation for dealing cards
function animateDeal(cards, indices) {
  const startX = (canvas.width - (5 * CARD_WIDTH + 4 * CARD_SPACING)) / 2;
  const y = canvas.height / 2 - CARD_HEIGHT / 2;
  
  game.animatingCards = cards.map((card, i) => {
    const index = indices ? indices[i] : i;
    const endX = startX + index * (CARD_WIDTH + CARD_SPACING);
    return {
      card,
      startX: DECK_X,
      startY: DECK_Y,
      endX,
      endY: y,
      x: DECK_X,
      y: DECK_Y,
      progress: 0,
      flipProgress: 0,
      duration: 600 + i * 80
    };
  });
}

// Evaluate poker hand
function evaluateHand(hand) {
  const ranks = hand.map(c => c.value).sort((a, b) => a - b);
  const suits = hand.map(c => c.suit);
  const rankCounts = {};
  
  ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  
  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = ranks.every((r, i) => i === 0 || r === ranks[i - 1] + 1) ||
                     (ranks[0] === 2 && ranks[4] === 14 && ranks[1] === 3 && ranks[2] === 4 && ranks[3] === 5);
  const isRoyal = isStraight && ranks[0] === 10;
  
  if (isRoyal && isFlush) return 'Royal Flush';
  if (isStraight && isFlush) return 'Straight Flush';
  if (counts[0] === 4) return 'Four of a Kind';
  if (counts[0] === 3 && counts[1] === 2) return 'Full House';
  if (isFlush) return 'Flush';
  if (isStraight) return 'Straight';
  if (counts[0] === 3) return 'Three of a Kind';
  if (counts[0] === 2 && counts[1] === 2) return 'Two Pair';
  if (counts[0] === 2) {
    const pairRank = Object.keys(rankCounts).find(k => rankCounts[k] === 2);
    if (parseInt(pairRank) >= 11) return 'Jacks or Better';
  }
  
  return null;
}

// Handle click
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Check bet button
  if (game.state === 'INITIAL' && 
      x >= canvas.width / 2 - 200 && x <= canvas.width / 2 - 80 &&
      y >= canvas.height - 50 && y <= canvas.height - 10) {
    showBetModal();
    return;
  }
  
  // Check play/draw/next button
  if (x >= canvas.width / 2 + 80 && x <= canvas.width / 2 + 200 &&
      y >= canvas.height - 50 && y <= canvas.height - 10) {
    handlePlayButton();
    return;
  }
  
  // Check card selection
  if (game.state === 'SELECT') {
    const startX = (canvas.width - (5 * CARD_WIDTH + 4 * CARD_SPACING)) / 2;
    const cardY = canvas.height / 2 - CARD_HEIGHT / 2;
    
    game.hand.forEach((card, index) => {
      const cardX = startX + index * (CARD_WIDTH + CARD_SPACING);
      if (x >= cardX && x <= cardX + CARD_WIDTH &&
          y >= cardY && y <= cardY + CARD_HEIGHT) {
        toggleCardSelection(index);
      }
    });
  }
});

function toggleCardSelection(index) {
  if (game.selectedCards.has(index)) {
    game.selectedCards.delete(index);
  } else {
    game.selectedCards.add(index);
  }
  render();
}

function handlePlayButton() {
  if (game.state === 'INITIAL') {
    if (game.balance < game.bet) {
      alert('Insufficient balance!');
      return;
    }
    game.balance -= game.bet;
    game.deck = createDeck();
    const dealtCards = game.deck.splice(0, 5);
    game.selectedCards.clear();
    game.state = 'ANIMATING';
    
    // Store cards but don't show them yet - animation will handle display
    game.hand = dealtCards;
    animateDeal(dealtCards);
  } else if (game.state === 'SELECT') {
    // Get cards to replace
    const cardsToReplace = [];
    const replaceIndices = [];
    
    game.hand.forEach((card, index) => {
      if (!game.selectedCards.has(index)) {
        const newCard = game.deck.pop();
        cardsToReplace.push(newCard);
        replaceIndices.push(index);
      }
    });
    
    // Clear selection after roll
    game.selectedCards.clear();
    
    if (cardsToReplace.length > 0) {
      // Update hand with new cards
      replaceIndices.forEach((handIndex, i) => {
        game.hand[handIndex] = cardsToReplace[i];
      });
      
      game.state = 'ANIMATING_ROLL';
      animateDeal(cardsToReplace, replaceIndices);
    } else {
      // No cards to replace, evaluate immediately
      game.winningHand = evaluateHand(game.hand);
      game.winAmount = game.winningHand ? PAYOUTS[game.winningHand] * game.bet : 0;
      game.state = 'RESULT';
    }
  } else if (game.state === 'RESULT') {
    game.balance += game.winAmount;
    game.winAmount = 0;
    game.winningHand = null;
    game.selectedCards.clear();
    game.hand = [];
    game.state = 'INITIAL';
  }
  
  render();
}

// Bet modal
function showBetModal() {
  document.getElementById('betModal').classList.add('active');
}

document.querySelectorAll('.bet-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    game.bet = parseInt(btn.dataset.bet);
    document.getElementById('betModal').classList.remove('active');
    render();
  });
});

// Initialize
loadImages().then(() => {
  requestAnimationFrame(gameLoop);
  console.log('Game loaded!');
});
