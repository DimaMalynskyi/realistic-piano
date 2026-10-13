# MIDI Piano

The original dark piano, expanded to 60 notes from C2 through B6. No new
dependencies, network requests, sample downloads, or build steps are required.

## Run

Open `index.html` in a current Chrome, Edge, Firefox, or Safari browser. Click or
press a piano key to enable audio. Start with a low system/headphone volume.
This is a static page and also works with an existing local static server.
The existing `package.json` is unchanged; `npm install` is not needed to play.

## Controls

The computer keyboard plays one selected octave at a time. The default is C4-B4,
preserving the original shortcuts and pitches. Select the octave with the menu,
the number keys 1-5 (C2-C6), or Left/Right arrows. Arrows retain their normal
behavior while a menu or volume slider has focus.

| Note in selected octave | C | C#/Db | D | D#/Eb | E | F | F#/Gb | G | G#/Ab | A | A#/Bb | B |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Physical keyboard key | Z | S | X | D | C | V | G | B | H | N | J | M |

Only the selected octave shows these shortcuts. Held notes retain their original
pitch when the octave changes; releasing the physical key releases that original
note. Different keys can therefore span octaves in a chord. Shortcut positions
use `KeyboardEvent.code`, so labels describe a QWERTY keyboard's physical layout.
Some computer keyboards cannot report certain large chords (hardware ghosting).

Click/hold any note with the mouse, or use multiple fingers on a touchscreen.
Release outside the piano to stop the captured note. Smaller screens show a
horizontally scrollable keyboard; octave selection scrolls its keys into view.
Tab to individual piano keys and hold Enter or Space to play them. Black-key
tooltips and accessible labels include the equivalent flat note name.

## Sound

`script.js` creates a mono Web Audio buffer on the first use of each pitch and
caches it. Equal-tempered frequencies use MIDI numbering with A4 = 440 Hz.
Each tone combines up to 20 partials with slight string-like inharmonicity,
a short, quiet filtered-noise hammer transient, and a gradual attack. Higher
partials decay faster than the fundamental; bass notes ring longer than treble.
Partials above the safe sample-rate limit are omitted to avoid aliasing.

Each press gets its own buffer source and gain envelope. Releasing the last input
holding a note fades it smoothly over about 400 ms, while other notes keep playing.
Rapid repetitions can overlap the previous release tail. Finished sources are
disconnected. A soft compressor controls chord peaks, and the volume slider
changes gain smoothly. Audio is created/resumed only from a playing interaction;
pending notes released during resume do not start afterward.

This is piano-like synthesis, not a sampled acoustic instrument. It does not
reproduce a real soundboard, sympathetic strings, room acoustics, velocity layers,
or pedal resonance. No third-party audio assets are used, so there is no sample
license or download to configure. A properly licensed multisampled acoustic
piano would offer substantially higher realism at the cost of downloads/loading.
The first use of a note needs a short buffer-generation step; subsequent presses
reuse that buffer.

## Files

- `index.html`: viewport metadata, keyboard container, octave and volume controls.
- `styles.css`: original dark treatment, five-octave geometry, note/shortcut
  labels, focus styling, and responsive horizontal scrolling.
- `script.js`: generated note metadata, synthesis, independent polyphonic voices,
  and per-input ownership for keyboard/mouse/touch. Blur, hidden pages, pointer
  cancellation, lost capture, and page navigation clear held notes.
- `used.js` and `package.json`: unchanged; `used.js` is not loaded by the piano.

## Test Locally

1. Open the page and hold Z, C, and B together: C4/E4/G4 should all sound and
   highlight. Hold a single note for several seconds to hear its natural decay.
2. Release one chord key: only that note should fade. Try very quick taps and
   repeated presses; listen for clicks or unexpected jumps in volume.
3. Hold Z, press 4, then release Z: C4 should release, not remain stuck. Press
   Z again to play C5. Check all five octave selections and their black keys.
4. Hold Z and click/hold C4 at the same time. Release either input: the other
   should keep C4 held. Drag the mouse outside the piano before releasing.
5. Hold notes and switch windows/tabs: highlights must clear and notes must
   release. Return and play again. On a touch device, try multi-finger chords
   and interruptions such as switching apps.
6. Try a narrow browser window and both ends of the keyboard. Check that labels,
   controls, and black keys do not overlap. Test the volume slider, including mute.
7. Check the browser developer console for errors. `node --check script.js`
   checks JavaScript syntax, if Node is installed. The existing npm test script
   is a placeholder, not a piano test suite.