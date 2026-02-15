# 🎭 Heads Up - PWA Guessing Game

A charades-style guessing game where you hold your phone to your forehead and guess words based on clues from your friends. Built as a Progressive Web App (PWA) with full offline support.

## ✨ Features

- 🎮 **6 Categories**: Movies, Animals, Celebrities, Actions, Food, Sports
- 📱 **Tilt Detection**: Tilt down for correct, tilt up to skip
- ⏱️ **60-Second Timer**: Fast-paced gameplay
- 📊 **Score Tracking**: See your results at the end
- 📴 **Offline Support**: Play anywhere, even without internet
- 💾 **Install to Home Screen**: Full PWA experience

## 🚀 Quick Start

### Run Locally

Simply open `index.html` in a web browser, or use a local server:

```bash
# Python 3
python -m http.server 8000

# Node.js (with http-server)
npx http-server -p 8000
```

Then visit `http://localhost:8000`

### Deploy to Cloudflare Pages

1. **Push to GitHub**: Commit all files to a GitHub repository

2. **Connect to Cloudflare Pages**:
   - Go to [Cloudflare Pages](https://pages.cloudflare.com/)
   - Click "Create a project"
   - Connect your GitHub repository
   - Use these settings:
     - **Build command**: (leave empty)
     - **Build output directory**: `/`
     - **Root directory**: `/`

3. **Deploy**: Cloudflare will automatically deploy your app

## 📁 Project Structure

```
HeadsUp/
├── index.html          # Main HTML structure
├── styles.css          # Styling with animations
├── app.js              # Game logic and tilt detection
├── data.js             # Card data for all categories
├── manifest.json       # PWA manifest
├── sw.js               # Service worker for offline support
├── icon-192.png        # App icon (192x192)
├── icon-512.png        # App icon (512x512)
└── README.md           # This file
```

## 🎮 How to Play

1. **Choose a Category**: Select from Movies, Animals, Celebrities, etc.
2. **Hold Phone to Forehead**: The word appears on screen (you can't see it!)
3. **Friends Give Clues**: They act, describe, or give hints
4. **Tilt to Answer**:
   - **Tilt Down** (⬇️): You guessed correctly - next word!
   - **Tilt Up** (⬆️): Skip this word
5. **Beat the Clock**: Score as many points as you can in 60 seconds!

## 🛠️ Tech Stack

- **HTML/CSS/JavaScript**: Vanilla web technologies
- **Oat.ink**: Lightweight CSS framework
- **Device Orientation API**: For tilt detection
- **Service Workers**: For PWA offline support
- **Cloudflare Pages**: Static site hosting

## 📱 PWA Features

- **Installable**: Add to home screen on iOS and Android
- **Offline First**: Works without internet connection
- **Responsive**: Optimized for mobile devices
- **Fast**: Cached assets load instantly

## 🎨 Customization

### Add New Categories

Edit `data.js` and add a new category:

```javascript
{
    id: 7,
    name: "Your Category",
    emoji: "🎯",
    cards: [
        "Word 1", "Word 2", "Word 3", ...
    ]
}
```

### Change Timer Duration

Edit `app.js` and modify the initial `timeLeft` value:

```javascript
gameState = {
    ...
    timeLeft: 90, // Change from 60 to 90 seconds
    ...
};
```

## 🔧 Browser Support

- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Safari (iOS & macOS)
- ✅ Firefox (Desktop & Mobile)
- ⚠️ Requires Device Orientation API for tilt detection

**Note**: On iOS 13+, you'll be prompted to allow motion & orientation access when starting a game.

## 📄 License

Free to use and modify for personal and commercial projects.

## 🙋 Credits

Built with ❤️ using modern web technologies and the Oat.ink CSS framework.
