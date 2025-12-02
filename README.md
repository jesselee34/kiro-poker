# Video Poker Game

A classic video poker game built with HTML5 Canvas and JavaScript.

## Features

- 5-card draw poker gameplay
- Multiple bet amounts ($1, $2, $5, $10)
- Standard poker hand payouts (Royal Flush, Straight Flush, etc.)
- Card hold/discard mechanics
- Animated card dealing and flipping
- Win/loss indicators

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd <repo-name>
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## How to Play

1. Click the **Bet** button to select your bet amount
2. Click **Play** to deal your initial 5 cards
3. Click on cards you want to **HOLD** (they'll lift up)
4. Click **Roll** to replace the cards you didn't hold
5. Win payouts are based on your poker hand and bet amount
6. Click **Next** to start a new round

## Poker Hand Payouts

| Hand | Payout (multiplier) |
|------|---------------------|
| Royal Flush | 250x |
| Straight Flush | 50x |
| Four of a Kind | 25x |
| Full House | 9x |
| Flush | 6x |
| Straight | 4x |
| Three of a Kind | 3x |
| Two Pair | 2x |
| Jacks or Better | 1x |

## Credits

- Card sprites by [Fageltomten](https://fageltomten.itch.io/classic-playing-cards)

## License

MIT
