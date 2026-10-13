// Midi Piano

const NOTE_DETAILS = [
    { note: "C", key: "Z", frequency: 261.626 },
    { note: "Db", key: "S", frequency: 277.183 },
    { note: "D", key: "X", frequency: 293.665 },
    { note: "Eb", key: "D", frequency: 311.127 },
    { note: "E", key: "C", frequency: 329.628 },
    { note: "F", key: "V", frequency: 349.228 },
    { note: "Gb", key: "G", frequency: 369.994 },
    { note: "G", key: "B", frequency: 391.995 },
    { note: "Ab", key: "H", frequency: 415.305 },
    { note: "A", key: "N", frequency: 440 },
    { note: "Bb", key: "J", frequency: 466.164 },
    { note: "B", key: "M", frequency: 493.883 },
]

const pianoKeys = document.querySelectorAll(".key")
const activeNotes = new Map()
let audioContext

function startNote(noteDetail) {
    if (activeNotes.has(noteDetail.note)) return

    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    audioContext ??= new AudioContextClass()
    if (audioContext.state === "suspended") audioContext.resume()

    const envelope = audioContext.createGain()
    const fundamental = audioContext.createOscillator()
    const overtone = audioContext.createOscillator()
    const overtoneGain = audioContext.createGain()
    const now = audioContext.currentTime

    fundamental.type = "sine"
    fundamental.frequency.value = noteDetail.frequency
    overtone.type = "sine"
    overtone.frequency.value = noteDetail.frequency * 2
    overtoneGain.gain.value = 0.12
    envelope.gain.setValueAtTime(0.0001, now)
    envelope.gain.exponentialRampToValueAtTime(0.22, now + 0.012)
    envelope.gain.exponentialRampToValueAtTime(0.09, now + 0.35)

    fundamental.connect(envelope)
    overtone.connect(overtoneGain)
    overtoneGain.connect(envelope)
    envelope.connect(audioContext.destination)
    fundamental.start(now)
    overtone.start(now)

    const key = document.querySelector(`.key[data-note="${noteDetail.note}"]`)
    key?.classList.add("active")
    activeNotes.set(noteDetail.note, { envelope, fundamental, overtone, key })
}

function stopNote(note) {
    const voice = activeNotes.get(note)
    if (!voice) return

    const now = audioContext.currentTime
    voice.envelope.gain.cancelScheduledValues(now)
    voice.envelope.gain.setTargetAtTime(0.0001, now, 0.08)
    voice.fundamental.stop(now + 0.3)
    voice.overtone.stop(now + 0.3)
    voice.key?.classList.remove("active")
    activeNotes.delete(note)
}

function getNoteDetail(keyCode) {
    return NOTE_DETAILS.find(({ key }) => `Key${key}` === keyCode)
}

document.addEventListener("keydown", event => {
    const noteDetail = getNoteDetail(event.code)
    if (!noteDetail || event.repeat) return

    event.preventDefault()
    startNote(noteDetail)
})

document.addEventListener("keyup", event => {
    const noteDetail = getNoteDetail(event.code)
    if (noteDetail) stopNote(noteDetail.note)
})

pianoKeys.forEach(key => {
    const noteDetail = NOTE_DETAILS.find(({ note }) => note === key.dataset.note)
    if (!noteDetail) return

    key.addEventListener("pointerdown", event => {
        event.preventDefault()
        key.setPointerCapture(event.pointerId)
        startNote(noteDetail)
    })
    key.addEventListener("pointerup", () => stopNote(noteDetail.note))
    key.addEventListener("pointercancel", () => stopNote(noteDetail.note))
})

window.addEventListener("blur", () => {
    activeNotes.forEach((_, note) => stopNote(note))
})
