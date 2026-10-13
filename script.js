// Midi Piano

const FIRST_OCTAVE = 3
const LAST_OCTAVE = 5
const VOICE_GAIN = 0.2
const ATTACK_TIME = 0.008
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
const SHORTCUTS = ["Z", "S", "X", "D", "C", "V", "G", "B", "H", "N", "J", "M"]
const NOTE_DETAILS = []

for (let octave = FIRST_OCTAVE; octave <= LAST_OCTAVE; octave++) {
    NOTE_NAMES.forEach((name, semitone) => {
        const midi = (octave + 1) * 12 + semitone
        NOTE_DETAILS.push({
            note: `${name}${octave}`,
            flat: `${FLAT_NAMES[semitone]}${octave}`,
            octave,
            semitone,
            midi,
            frequency: 440 * 2 ** ((midi - 69) / 12),
            key: SHORTCUTS[semitone],
            black: name.includes("#")
        })
    })
}

const piano = document.querySelector(".piano")
const audioStatus = document.querySelector("#audio-status")
const notesByName = new Map(NOTE_DETAILS.map(detail => [detail.note, detail]))
const keyElements = new Map()
const activeNotes = new Map()
const inputNotes = new Map()
const noteBuffers = new Map()
let selectedOctave = 4
let audioContext
let masterGain
let compressor
let toneFilter
let audioReady

function renderKeys() {
    const whiteKeyCount = NOTE_DETAILS.filter(detail => !detail.black).length
    let whiteKeysBefore = 0

    NOTE_DETAILS.forEach(detail => {
        const key = document.createElement("button")
        key.type = "button"
        key.className = `key ${detail.black ? "black" : "white"}`
        key.dataset.note = detail.note
        key.dataset.octave = detail.octave
        key.setAttribute("aria-pressed", "false")
        key.title = detail.black ? `${detail.note} / ${detail.flat}` : detail.note

        if (detail.black) {
            key.style.left = `${(whiteKeysBefore - 0.32) / whiteKeyCount * 100}%`
            key.style.width = `${0.64 / whiteKeyCount * 100}%`
        } else {
            whiteKeysBefore++
        }

        const label = document.createElement("span")
        label.className = "note-label"
        label.textContent = detail.note
        const shortcut = document.createElement("span")
        shortcut.className = "shortcut"
        key.append(shortcut, label)
        piano.append(key)
        keyElements.set(detail.note, key)

        key.addEventListener("pointerdown", event => {
            if (event.pointerType === "mouse" && event.button !== 0) return
            event.preventDefault()
            key.setPointerCapture(event.pointerId)
            pressNote(detail, `pointer:${event.pointerId}`)
        })
        const releasePointer = event => releaseInput(`pointer:${event.pointerId}`)
        key.addEventListener("pointerup", releasePointer)
        key.addEventListener("pointercancel", releasePointer)
        key.addEventListener("lostpointercapture", releasePointer)
    })
    updateShortcuts(false)
}

function updateShortcuts(scroll = true) {
    NOTE_DETAILS.forEach(detail => {
        const key = keyElements.get(detail.note)
        const selected = detail.octave === selectedOctave
        key.querySelector(".shortcut").textContent = selected ? detail.key : ""
        key.setAttribute("aria-label", `${key.title}${selected ? `, keyboard ${detail.key}` : ""}`)
    })
    if (scroll) {
        keyElements.get(`F${selectedOctave}`).scrollIntoView({ block: "nearest", inline: "center" })
    }
}

async function ensureAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) throw new Error("This browser does not support Web Audio.")

    if (!audioContext) {
        audioContext = new AudioContextClass()
        masterGain = audioContext.createGain()
        masterGain.gain.value = 0.55
        toneFilter = audioContext.createBiquadFilter()
        toneFilter.type = "lowpass"
        toneFilter.frequency.value = 4200
        toneFilter.Q.value = 0.5
        compressor = audioContext.createDynamicsCompressor()
        compressor.threshold.value = -18
        compressor.knee.value = 18
        compressor.ratio.value = 4
        compressor.attack.value = 0.003
        compressor.release.value = 0.2
        toneFilter.connect(compressor)
        compressor.connect(masterGain)
        masterGain.connect(audioContext.destination)
        audioContext.addEventListener("statechange", () => {
            if (audioContext.state === "running") return
            releaseAllInputs()
            audioStatus.textContent = "Audio paused. Play a note to resume."
        })
    }

    if (audioContext.state !== "running") {
        audioReady ??= audioContext.resume().finally(() => { audioReady = undefined })
        await audioReady
    }
    if (audioContext.state !== "running") throw new Error("Audio is paused. Play again to resume.")
    audioStatus.textContent = "Sound ready"
}

function createPianoBuffer(detail) {
    if (noteBuffers.has(detail.note)) return noteBuffers.get(detail.note)

    const sampleRate = audioContext.sampleRate
    const decay = Math.max(0.65, 2.8 * (130.81 / detail.frequency) ** 0.35)
    const duration = decay * 4 + 0.15
    const buffer = audioContext.createBuffer(1, Math.ceil(duration * sampleRate), sampleRate)
    const samples = buffer.getChannelData(0)
    const stiffness = 0.00006 * (detail.frequency / 261.626) ** 0.5
    let totalAmplitude = 0

    for (let harmonic = 1; harmonic <= 16; harmonic++) {
        const frequency = detail.frequency * harmonic *
            Math.sqrt((1 + stiffness * harmonic ** 2) / (1 + stiffness))
        if (frequency >= sampleRate * 0.45) break

        const amplitude = 1 / harmonic ** 1.9
        totalAmplitude += amplitude
        const partialDecay = decay / (1 + (harmonic - 1) * 0.32)
        const decayStep = Math.exp(-1 / (partialDecay * sampleRate))
        const phaseStep = 2 * Math.PI * frequency / sampleRate
        const rotationReal = Math.cos(phaseStep)
        const rotationImaginary = Math.sin(phaseStep)
        const attackSamples = sampleRate * (0.006 + 0.002 / harmonic)
        let phaseReal = 1
        let phaseImaginary = 0
        let level = amplitude

        for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex++) {
            samples[sampleIndex] += phaseImaginary * level * Math.min(1, sampleIndex / attackSamples)
            const nextReal = phaseReal * rotationReal - phaseImaginary * rotationImaginary
            phaseImaginary = phaseImaginary * rotationReal + phaseReal * rotationImaginary
            phaseReal = nextReal
            level *= decayStep
        }
    }

    let noiseSeed = detail.midi
    let previousNoise = 0
    const fadeSamples = Math.ceil(sampleRate * 0.08)
    for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex++) {
        const time = sampleIndex / sampleRate
        noiseSeed = (Math.imul(noiseSeed, 1664525) + 1013904223) >>> 0
        const noise = noiseSeed / 2147483648 - 1
        previousNoise = previousNoise * 0.75 + noise * 0.25
        const hammer = previousNoise * 0.015 * Math.exp(-time / 0.009) * Math.min(1, time / 0.003)
        const tailFade = Math.min(1, (samples.length - 1 - sampleIndex) / fadeSamples)
        samples[sampleIndex] = (samples[sampleIndex] / totalAmplitude + hammer) * 0.8 * tailFade
    }
    noteBuffers.set(detail.note, buffer)
    return buffer
}

function startNote(detail, entry) {
    const source = audioContext.createBufferSource()
    source.buffer = createPianoBuffer(detail)
    const envelope = audioContext.createGain()
    const now = audioContext.currentTime
    envelope.gain.setValueAtTime(0, now)
    envelope.gain.linearRampToValueAtTime(VOICE_GAIN, now + ATTACK_TIME)
    source.connect(envelope)
    envelope.connect(toneFilter)
    const voice = { source, envelope, startedAt: now, released: false }
    entry.voice = voice
    source.onended = () => {
        source.disconnect()
        envelope.disconnect()
        if (entry.voice === voice) entry.voice = undefined
    }
    source.start(now)
}

function stopNote(voice) {
    if (!voice || voice.released) return
    voice.released = true
    const now = audioContext.currentTime
    const heldGain = VOICE_GAIN * Math.min(1, (now - voice.startedAt) / ATTACK_TIME)
    if (typeof voice.envelope.gain.cancelAndHoldAtTime === "function") {
        voice.envelope.gain.cancelAndHoldAtTime(now)
    } else {
        voice.envelope.gain.cancelScheduledValues(now)
        voice.envelope.gain.setValueAtTime(heldGain, now)
    }
    voice.envelope.gain.setTargetAtTime(0, now, 0.055)
    voice.envelope.gain.setValueAtTime(heldGain * Math.exp(-0.39 / 0.055), now + 0.39)
    voice.envelope.gain.linearRampToValueAtTime(0, now + 0.4)
    voice.source.stop(now + 0.41)
}

function setKeyActive(note, active) {
    const key = keyElements.get(note)
    key.classList.toggle("active", active)
    key.setAttribute("aria-pressed", String(active))
}

async function pressNote(detail, input) {
    if (inputNotes.has(input)) return
    inputNotes.set(input, detail.note)
    let entry = activeNotes.get(detail.note)
    if (entry) {
        entry.inputs.add(input)
        return
    }
    entry = { inputs: new Set([input]), voice: undefined }
    activeNotes.set(detail.note, entry)
    setKeyActive(detail.note, true)

    try {
        await ensureAudio()
        if (activeNotes.get(detail.note) !== entry || entry.inputs.size === 0) return
        startNote(detail, entry)
    } catch (error) {
        if (activeNotes.get(detail.note) === entry) {
            for (const owner of entry.inputs) inputNotes.delete(owner)
            activeNotes.delete(detail.note)
            setKeyActive(detail.note, false)
        }
        audioStatus.textContent = error.message
    }
}

function releaseInput(input) {
    const note = inputNotes.get(input)
    if (!note) return
    inputNotes.delete(input)
    const entry = activeNotes.get(note)
    if (!entry) return
    entry.inputs.delete(input)
    if (entry.inputs.size > 0) return
    stopNote(entry.voice)
    activeNotes.delete(note)
    setKeyActive(note, false)
}

function releaseAllInputs() {
    for (const input of inputNotes.keys()) releaseInput(input)
}

document.addEventListener("keydown", event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    if (event.target.closest("input, select, textarea, [contenteditable='true']")) return

    const octaveDigit = /^Digit([1-3])$/.exec(event.code)
    if (octaveDigit) {
        event.preventDefault()
        if (event.repeat) return
        selectedOctave = Number(octaveDigit[1]) + FIRST_OCTAVE - 1
        updateShortcuts()
        return
    }

    let detail = NOTE_DETAILS.find(note => note.octave === selectedOctave && `Key${note.key}` === event.code)
    if ((event.code === "Space" || event.code === "Enter") && event.target.matches(".key")) {
        detail = notesByName.get(event.target.dataset.note)
    }
    if (!detail) return
    event.preventDefault()
    if (event.repeat) return
    pressNote(detail, `keyboard:${event.code}`)
})

document.addEventListener("keyup", event => releaseInput(`keyboard:${event.code}`))
document.addEventListener("pointerup", event => releaseInput(`pointer:${event.pointerId}`))
document.addEventListener("pointercancel", event => releaseInput(`pointer:${event.pointerId}`))
window.addEventListener("blur", releaseAllInputs)
window.addEventListener("pagehide", releaseAllInputs)
document.addEventListener("visibilitychange", () => {
    if (document.hidden) releaseAllInputs()
})

renderKeys()
