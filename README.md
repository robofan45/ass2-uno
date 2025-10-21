# UNO Card Images Collection

A complete collection of UNO card images organized by color and card type.

## Project Structure

```
cards/
├── red/          # Red colored cards
├── blue/         # Blue colored cards
├── green/        # Green colored cards
├── yellow/       # Yellow colored cards
└── special/      # Special cards (Wild, Wild Draw 4, Reverse)
```

## Card Types

### Number Cards (0-9)
Each color (red, blue, green, yellow) contains:
- Number cards from 0 to 9

### Action Cards
Each color contains:
- **Skip**: Skip the next player's turn
- **Draw 2**: Next player draws 2 cards and loses their turn

### Special Cards
Located in the `special/` folder:
- **Wild**: Can be played on any card, player chooses the color
- **Wild Draw 4**: Next player draws 4 cards, current player chooses color
- **Reverse** (Red, Blue, Green, Yellow): Reverses the direction of play

## File Naming Convention

All files follow a consistent lowercase naming pattern:
- Number cards: `0.jpg` to `9.jpg`
- Action cards: `skip.jpg`, `draw-2.jpg`
- Special cards: `wild.jpg`, `wild-draw-4.jpg`, `reverse-{color}.jpg`

## Card Inventory

### Red Cards (12 cards)
- Numbers: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
- Actions: Skip, Draw 2

### Blue Cards (11 cards)
- Numbers: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
- Actions: Skip

### Green Cards (12 cards)
- Numbers: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
- Actions: Skip, Draw 2

### Yellow Cards (12 cards)
- Numbers: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
- Actions: Skip, Draw 2

### Special Cards (6 cards)
- Wild
- Wild Draw 4
- Reverse: Blue, Red, Green, Yellow

## Total Cards: 53 images

## Usage

These card images can be used for:
- UNO game development
- Educational purposes
- Game prototyping
- UNO-related applications

## Notes

- All images are in JPEG format
- Images maintain original UNO card design
- Organized structure makes it easy to programmatically access cards by color and type
