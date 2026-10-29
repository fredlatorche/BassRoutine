// Bass Routine — © 2026 FredLatorche (https://github.com/fredlatorche/BassRoutine). Tous droits réservés.
// Joue une ligne de basse simple sur le synthé intégré de macOS (banque General MIDI d'Apple).
// Usage : swift basse.swift [tempo] [mesures]
//   ex. : swift basse.swift 100 8

import AVFoundation

let args = CommandLine.arguments
let tempo = args.count > 1 ? Double(args[1]) ?? 100 : 100   // BPM
let mesures = args.count > 2 ? Int(args[2]) ?? 8 : 8
let tempsParMesure = 4
let note: UInt8 = 28        // Mi grave (E1), corde de Mi à vide de la basse
let programme: UInt8 = 33   // GM 34 : Electric Bass (finger)

let engine = AVAudioEngine()
let sampler = AVAudioUnitSampler()
engine.attach(sampler)
engine.connect(sampler, to: engine.mainMixerNode, format: nil)

let banque = URL(fileURLWithPath: "/System/Library/Components/CoreAudio.component/Contents/Resources/gs_instruments.dls")
do {
    try sampler.loadSoundBankInstrument(at: banque, program: programme,
                                        bankMSB: UInt8(kAUSampler_DefaultMelodicBankMSB),
                                        bankLSB: UInt8(kAUSampler_DefaultBankLSB))
    try engine.start()
} catch {
    print("Erreur d'initialisation audio : \(error)")
    exit(1)
}

let dureeTemps = 60.0 / tempo
print("Mi grave, \(tempsParMesure) temps × \(mesures) mesures à \(Int(tempo)) BPM")

Thread.sleep(forTimeInterval: 0.2)  // laisse le moteur démarrer
for m in 1...mesures {
    for t in 1...tempsParMesure {
        print("Mesure \(m) – temps \(t)", terminator: "\r")
        fflush(stdout)
        let velocite: UInt8 = t == 1 ? 110 : 90   // léger accent sur le 1er temps
        sampler.startNote(note, withVelocity: velocite, onChannel: 0)
        Thread.sleep(forTimeInterval: dureeTemps * 0.85)
        sampler.stopNote(note, onChannel: 0)
        Thread.sleep(forTimeInterval: dureeTemps * 0.15)
    }
}
print("\nTerminé.")
Thread.sleep(forTimeInterval: 0.5)  // laisse sonner la fin
engine.stop()
