# YouTube Live Chat Auto Translator

A lightweight userscript that automatically translates non-English YouTube live chat messages in real time and lets you reply back in the same language directly from chat.

Built for international livestreams, gaming chats, VTuber streams, and anyone tired of constantly switching tabs to translate messages manually.

---

## Features

- Automatically detects non-English messages
- Instantly translates chat messages into English
- Displays original messages below translations
- Smart English detection
- Translation caching for improved performance
- Real-time live chat monitoring
- Reply directly in another language
- Automatically translates your replies before sending
- Lightweight and dependency free
- Integrated cleanly into YouTube's chat UI

---

## Supported Languages

| Code | Language |
|------|-----------|
| es | Spanish |
| fr | French |
| de | German |
| it | Italian |
| pt | Portuguese |
| ru | Russian |
| ja | Japanese |
| ko | Korean |
| zh-CN | Chinese (Simplified) |
| zh-TW | Chinese (Traditional) |
| ar | Arabic |
| hi | Hindi |
| th | Thai |
| vi | Vietnamese |
| id | Indonesian |
| tr | Turkish |
| pl | Polish |
| nl | Dutch |
| sv | Swedish |
| da | Danish |
| fi | Finnish |
| no | Norwegian |
| cs | Czech |
| hu | Hungarian |
| ro | Romanian |
| uk | Ukrainian |
| el | Greek |
| he | Hebrew |

---

## How It Works

The script uses a `MutationObserver` to monitor YouTube live chat in real time.

When a non-English message appears:
- the language is detected automatically
- the message is translated into English
- the translated version replaces the original
- the original message is preserved underneath

Example:

```text
[Japanese→EN] Hello everyone!
Original: みんなこんにちは！
```

---

## Reply Translation System

The script also allows replying in the sender's language directly from YouTube chat.

### Workflow

1. Click a translated message
2. Open the user context menu
3. Select:

```text
Respond in Japanese
```

4. Type your reply in English
5. Press the translate button
6. The message is automatically translated before sending

---

## Installation

### Tampermonkey / Violentmonkey

1. Install one of the following:
   - Tampermonkey
   - Violentmonkey
   - Greasemonkey

2. Create a new userscript

3. Paste the script contents

4. Save the script

5. Open a YouTube livestream chat

6. The translator will initialize automatically

---

## Configuration

```js
const CONFIG = {
    targetLanguage: 'en',
    showOriginal: true,
    translateDelay: 100,
    cacheSize: 500
};
```

| Setting | Description |
|---|---|
| targetLanguage | Main translation target language |
| showOriginal | Displays original untranslated message |
| translateDelay | Delay before processing new messages |
| cacheSize | Maximum stored translation cache size |

---

## Technical Overview

### Core Components

- MutationObserver
- Dynamic DOM injection
- Google Translate endpoint integration
- Translation caching system
- Real-time message processing

### Translation Endpoint

The script uses the Google Translate public endpoint:

```text
https://translate.googleapis.com/translate_a/single
```

---

## Notes

- Uses an unofficial Google Translate endpoint
- Future YouTube DOM updates may require script adjustments
- Translation quality depends on Google Translate
- Extremely slang-heavy messages may translate poorly

---

## License

MIT License

You are free to modify, distribute, fork, or extend the project.

---

## Project Goal

The goal of the project is to make international YouTube livestream chats more accessible without requiring external translator tabs or manual copy-pasting.

It is especially useful for:
- international gaming streams
- VTuber livestreams
- multilingual communities
- global event livestreams
- casual cross-language interaction
