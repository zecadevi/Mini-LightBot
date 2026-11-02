
let selectedLevel = null

const levelSettings = {
    facil: {
        lights: 2
    },

    medio: {
        lights: 5
    },

    dificil: {
        lights: 11
    }
}

let menuSoundContext = null
let menuSoundGain = null
let menuSoundOscillators = []
let menuSoundInterval = null
let menuAudioEnabled = true
let currentMusicStage = "menu"
let musicRequestId = 0
const levelProgressKey = "mini-lightbot-unlocked-levels"
const levelSequence = ["facil", "medio", "dificil"]
let completedLevels = readCompletedLevels()

function readCompletedLevels() {
    try {
        const saved = JSON.parse(localStorage.getItem(levelProgressKey) || "[]")
        return Array.isArray(saved) ? saved.filter(level => levelSequence.includes(level)) : []
    } catch (_) {
        return []
    }
}

function isLevelUnlocked(level) {
    const index = levelSequence.indexOf(level)
    return index <= 0 || completedLevels.includes(levelSequence[index - 1])
}

function renderLevelSelection() {
    const cards = document.querySelectorAll("#level-screen .level-card")

    cards.forEach(card => {
        const level = card.dataset.level
        const unlocked = isLevelUnlocked(level)
        const lock = card.querySelector(".level-lock")

        card.disabled = !unlocked
        card.setAttribute("aria-disabled", String(!unlocked))
        card.classList.toggle("is-locked", !unlocked)
        if (lock) lock.hidden = unlocked
    })
}

function mountSelectionRobot() {
    const source = document.querySelector("#start-screen .hero-robot")
    const mount = document.getElementById("level-robot")
    if (!source || !mount || mount.childElementCount) return

    const robot = source.cloneNode(true)
    robot.classList.add("level-hero-robot")
    robot.setAttribute("focusable", "false")
    mount.appendChild(robot)
}

function recordLevelCompletion(level) {
    if (!levelSequence.includes(level) || completedLevels.includes(level)) return

    completedLevels.push(level)

    try {
        localStorage.setItem(levelProgressKey, JSON.stringify(completedLevels))
    } catch (_) {
        // A sessão ainda desbloqueia níveis se o armazenamento estiver indisponível.
    }

    renderLevelSelection()
    const newlyUnlocked = levelSequence[levelSequence.indexOf(level) + 1]
    const card = document.querySelector(`#level-screen .level-card[data-level="${newlyUnlocked}"]`)
    if (card) {
        card.classList.remove("level-unlock")
        requestAnimationFrame(() => card.classList.add("level-unlock"))
    }
}

function stopMenuSound() {
    musicRequestId += 1
    const context = menuSoundContext

    if (!context) return

    const gain = menuSoundGain
    const oscillators = menuSoundOscillators
    const now = context.currentTime

    if (menuSoundInterval !== null) {
        window.clearInterval(menuSoundInterval)
        menuSoundInterval = null
    }

    if (gain) {
        gain.gain.cancelScheduledValues(now)
        gain.gain.setTargetAtTime(0, now, 0.18)
    }

    menuSoundContext = null
    menuSoundGain = null
    menuSoundOscillators = []

    window.setTimeout(() => {
        oscillators.forEach(oscillator => {
            try {
                oscillator.stop()
            } catch (_) {
                // O oscilador pode já ter sido encerrado pelo navegador.
            }
        })

        context.close().catch(() => {})
    }, 900)
}

async function startStageMusic(stage = currentMusicStage) {
    stopMenuSound()
    const requestId = musicRequestId
    const AudioContext = window.AudioContext || window.webkitAudioContext

    if (!AudioContext) return false

    try {
        const context = new AudioContext()
        const masterGain = context.createGain()
        const trackSettings = {
            menu: { bass: [48, 43, 45, 41], interval: 360, wave: "triangle", seed: 42891 },
            levels: { bass: [50, 45, 46, 43], interval: 410, wave: "sine", seed: 72031 },
            "game-facil": { bass: [48, 55, 53, 43], interval: 330, wave: "triangle", seed: 39107 },
            "game-medio": { bass: [50, 46, 43, 48], interval: 300, wave: "triangle", seed: 62119 },
            "game-dificil": { bass: [43, 46, 41, 48], interval: 270, wave: "sawtooth", seed: 93187 }
        }
        const settings = trackSettings[stage] || trackSettings.menu
        const motifs = [
            [0, 2, 4, 2, 1, 3, 4, 3, 0, 2, 5, 4, 3, 2, 1, 0],
            [2, 4, 5, 4, 3, 4, 6, 4, 2, 4, 7, 6, 4, 3, 2, 1],
            [4, 5, 7, 5, 4, 3, 2, 4, 5, 7, 6, 4, 3, 2, 0, 2],
            [0, 1, 3, 4, 3, 1, 0, 2, 3, 5, 4, 3, 1, 2, 0, 0]
        ]
        const scale = stage === "levels" ? [0, 2, 3, 7, 9, 10, 12, 14] : [0, 2, 4, 7, 9, 12, 14, 16]
        const bass = settings.bass
        let seed = settings.seed
        let step = 0
        const melody = Array.from({ length: 1024 }, (_, index) => {
            const phrase = Math.floor(index / 16)
            const phraseStep = index % 16
            seed = (seed * 16807) % 2147483647
            const phraseMotif = (phrase + Math.floor(phrase / 4) + seed % motifs.length) % motifs.length
            const chordRoot = bass[Math.floor(phrase / 4) % bass.length] + 24
            const note = chordRoot + scale[motifs[phraseMotif][phraseStep]]

            return phraseStep === 15 && seed % 5 === 0 ? null : note
        })

        masterGain.gain.setValueAtTime(0, context.currentTime)
        masterGain.connect(context.destination)

        menuSoundContext = context
        menuSoundGain = masterGain
        menuSoundOscillators = []

        const playTone = (frequency, type, volume, duration, now) => {
            const oscillator = context.createOscillator()
            const envelope = context.createGain()

            oscillator.type = type
            oscillator.frequency.setValueAtTime(frequency, now)
            envelope.gain.setValueAtTime(0.0001, now)
            envelope.gain.linearRampToValueAtTime(volume, now + 0.02)
            envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)
            oscillator.connect(envelope)
            envelope.connect(masterGain)
            oscillator.addEventListener("ended", () => {
                menuSoundOscillators = menuSoundOscillators.filter(activeNote => activeNote !== oscillator)
            }, { once: true })
            oscillator.start(now)
            oscillator.stop(now + duration + 0.03)
            menuSoundOscillators.push(oscillator)
        }

        const playMusicStep = () => {
            if (menuSoundContext !== context || !menuAudioEnabled) return

            const now = context.currentTime

            const melodyNote = melody[step % melody.length]
            if (melodyNote !== null) {
                const frequency = 440 * (2 ** ((melodyNote - 69) / 12))
                playTone(frequency, settings.wave, 0.15, 0.22, now)
            }

            if (step % 4 === 0) {
                const bassNote = bass[Math.floor(step / 32) % bass.length]
                const bassFrequency = 440 * (2 ** ((bassNote - 69) / 12))
                playTone(bassFrequency, "sine", 0.12, 0.35, now)
            }

            step += 1
        }

        await context.resume()
        if (requestId !== musicRequestId || menuSoundContext !== context || context.state !== "running") return false

        const now = context.currentTime
        masterGain.gain.setValueAtTime(0, now)
        masterGain.gain.linearRampToValueAtTime(1, now + 0.8)
        playMusicStep()
        menuSoundInterval = window.setInterval(playMusicStep, settings.interval)
        return true
    } catch (_) {
        if (requestId === musicRequestId) stopMenuSound()
        return false
    }
}

function changeMusicStage(stage) {
    currentMusicStage = stage
    if (!menuAudioEnabled) return

    startStageMusic(stage).then(started => {
        if (!started && menuAudioEnabled) {
            menuAudioEnabled = false
            updateMenuSoundButton(false)
        }
    })
}

function updateMenuSoundButton(enabled) {
    const button = document.getElementById("menu-audio-toggle")
    if (!button) return

    button.setAttribute("aria-pressed", String(enabled))
    button.setAttribute("aria-label", enabled ? "Silenciar música" : "Ativar música")
    button.querySelector(".audio-label").textContent = enabled ? "Som ativado" : "Som silenciado"
}

function startGame(level) {
    if (!isLevelUnlocked(level)) return

    selectedLevel = level
    changeMusicStage(`game-${level}`)

    const startScreen = document.getElementById("start-screen")
    const levelScreen = document.getElementById("level-screen")
    const gameScreen = document.getElementById("game-screen")

    if (startScreen) startScreen.classList.add("hidden")
    if (levelScreen) levelScreen.classList.add("hidden")
    gameScreen.classList.remove("hidden")

    resetLevel()
}

document.addEventListener("DOMContentLoaded", () => {
    const startButton = document.getElementById("start-button")
    const startScreen = document.getElementById("start-screen")
    const levelScreen = document.getElementById("level-screen")
    const audioButton = document.getElementById("menu-audio-toggle")
    const backButton = document.getElementById("level-back-button")

    renderLevelSelection()
    mountSelectionRobot()

    document.querySelectorAll("#level-screen .level-card").forEach(card => {
        card.addEventListener("click", () => startGame(card.dataset.level))
    })

    if (audioButton) {
        startStageMusic("menu").then(started => {
            menuAudioEnabled = started
            updateMenuSoundButton(started)
            if (!started) audioButton.title = "Clique para ativar a música"
        })
    }

    if (startButton) {
        startButton.addEventListener("click", () => {
            renderLevelSelection()
            startScreen.classList.add("hidden")
            levelScreen.classList.remove("hidden")
            changeMusicStage("levels")
        })
    }

    if (backButton) {
        backButton.addEventListener("click", () => {
            levelScreen.classList.add("hidden")
            startScreen.classList.remove("hidden")
            changeMusicStage("menu")
        })
    }

    if (audioButton) {
        audioButton.addEventListener("click", async () => {
            if (menuAudioEnabled) {
                menuAudioEnabled = false
                stopMenuSound()
                updateMenuSoundButton(false)
                return
            }

            menuAudioEnabled = true
            audioButton.disabled = true
            const started = await startStageMusic(currentMusicStage)
            menuAudioEnabled = started
            updateMenuSoundButton(started)
            audioButton.title = started ? "Silenciar música" : "Áudio indisponível neste navegador"
            audioButton.disabled = false
        })
    }
})





const gridSize = 5

const grid = document.getElementById("grid")
const commandList = document.getElementById("command-list")
const directionDisplay = document.getElementById("direction")
const positionDisplay = document.getElementById("position")

const arrows = {
    right: "→",
    left: "←",
    up: "↑",
    down: "↓"
}


// ======================================================
// LÂMPADAS
// ======================================================

let lights = [
    {
        x: 2,
        y: 1,
        on: false,
        questionUsed: []
    },
    {
        x: 4,
        y: 3,
        on: false,
        questionUsed: []
    }
]


// ======================================================
// ESTADO DO ROBÔ
// ======================================================

let robotX = 0
let robotY = 0

let direction = "right"

let commands = []

let running = false

let quizActive = false

let currentQuestion = null

let currentLight = null

let questionResolver = null


// ======================================================
// BANCO DE PERGUNTAS
// DIFICULDADE: MÉDIA
// ======================================================

const questionBank = [

    {
        question: "O que significa HTML?",
        options: [
            "HyperText Markup Language",
            "HighText Machine Language",
            "HyperTool Multi Language",
            "HomeText Markup Language"
        ],
        correct: 0
    },

    {
        question: "Qual linguagem é executada principalmente no navegador para criar interações em páginas web?",
        options: [
            "JavaScript",
            "SQL",
            "Python",
            "C"
        ],
        correct: 0
    },

    {
        question: "Qual propriedade CSS é utilizada para alterar a cor de fundo de um elemento?",
        options: [
            "background-color",
            "font-color",
            "color-background",
            "bg-color"
        ],
        correct: 0
    },

    {
        question: "Qual destas opções representa uma estrutura de repetição?",
        options: [
            "for",
            "const",
            "return",
            "import"
        ],
        correct: 0
    },

    {
        question: "Em JavaScript, qual palavra-chave é utilizada para declarar uma variável que não pode ser reatribuída?",
        options: [
            "const",
            "let",
            "var",
            "static"
        ],
        correct: 0
    },

    {
        question: "Qual tecnologia é utilizada para estruturar o conteúdo de uma página web?",
        options: [
            "HTML",
            "CSS",
            "JavaScript",
            "SQL"
        ],
        correct: 0
    },

    {
        question: "Qual tecnologia é responsável principalmente pela aparência e estilização de uma página web?",
        options: [
            "CSS",
            "HTML",
            "SQL",
            "JSON"
        ],
        correct: 0
    },

    {
        question: "O que é uma função em programação?",
        options: [
            "Um bloco de código criado para executar uma tarefa",
            "Um tipo de banco de dados",
            "Um arquivo de imagem",
            "Um sistema operacional"
        ],
        correct: 0
    },

    {
        question: "Qual destas opções é um banco de dados?",
        options: [
            "MySQL",
            "HTML",
            "CSS",
            "Git"
        ],
        correct: 0
    },

    {
        question: "Qual comando Git é utilizado para enviar alterações para um repositório remoto?",
        options: [
            "git push",
            "git pull",
            "git clone",
            "git init"
        ],
        correct: 0
    },

    {
        question: "Qual tipo de dado JavaScript representa verdadeiro ou falso?",
        options: [
            "Boolean",
            "String",
            "Number",
            "Array"
        ],
        correct: 0
    },

    {
        question: "O que significa API?",
        options: [
            "Application Programming Interface",
            "Advanced Programming Internet",
            "Application Process Integration",
            "Automated Program Interface"
        ],
        correct: 0
    }

]


// ======================================================
// CRIA O TABULEIRO
// ======================================================

function createGrid() {

    grid.innerHTML = ""

    for (let i = 0; i < gridSize * gridSize; i++) {

        const tile = document.createElement("div")

        tile.classList.add("tile")

        grid.appendChild(tile)
    }

    updateGrid()
}


// ======================================================
// ATUALIZA O TABULEIRO
// ======================================================

function updateGrid() {

    const tiles = document.querySelectorAll(".tile")

    tiles.forEach((tile, index) => {

        tile.className = "tile"

        tile.innerHTML = ""

        const x = index % gridSize

        const y = Math.floor(index / gridSize)


        // Procura uma lâmpada nessa posição

        const light = lights.find(
            lightItem =>
                lightItem.x === x &&
                lightItem.y === y
        )


        // -----------------------------
        // LÂMPADA
        // -----------------------------

        if (light) {

            tile.classList.add(
                light.on
                    ? "light-on"
                    : "light-off"
            )

            const lamp = document.createElement("div")

            lamp.classList.add("lamp")

            lamp.textContent = "💡"

            if (light.on) {
                lamp.classList.add("lamp-on")
            }

            tile.appendChild(lamp)
        }


        // -----------------------------
        // ROBÔ
        // -----------------------------

        if (x === robotX && y === robotY) {

            tile.classList.add("robot")

            const robot = document.createElement("img")

            robot.src = "./assets/robot.svg"

            robot.alt = "Lightbot"

            robot.classList.add("robot-icon")

            tile.appendChild(robot)
        }

    })

    updateStatus()
}


// ======================================================
// STATUS
// ======================================================

function updateStatus() {

    directionDisplay.textContent =
        `Direção: ${arrows[direction]}`

    positionDisplay.textContent =
        `Posição: ${robotX},${robotY}`


    const countEl =
        document.getElementById("command-count")

    const previewEl =
        document.getElementById("command-preview")


    if (commands.length === 0) {

        countEl.textContent = "Comandos: 0"

        previewEl.textContent = ""

    } else {

        countEl.textContent =
            `Comandos: ${commands.length}`

        const preview =
            commands
                .slice(0, 6)
                .join(" • ")

        previewEl.textContent =
            preview +
            (commands.length > 6
                ? " • …"
                : "")
    }
}


// ======================================================
// ADICIONAR COMANDO
// ======================================================

function addCommand(cmd) {

    if (running || quizActive) {
        return
    }

    commands.push(cmd)

    updateStatus()
}


// ======================================================
// LIMPAR COMANDOS
// ======================================================

function clearCommands() {

    commands = []

    updateStatus()
}


// ======================================================
// HABILITAR / DESABILITAR CONTROLES
// ======================================================

function setControlsEnabled(enabled) {

    const controls =
        document.querySelectorAll(
            ".control-buttons button"
        )

    controls.forEach(button => {

        button.disabled = !enabled

    })
}


// ======================================================
// MOVIMENTO PELO TECLADO
// ======================================================

function stepMove(dir) {

    if (running || quizActive) {
        return
    }


    direction = dir

    moveForward()

    updateGrid()

    checkLightPosition()
}


// ======================================================
// MOVIMENTO PARA FRENTE
// ======================================================

function moveForward() {

    if (
        direction === "right" &&
        robotX < gridSize - 1
    ) {

        robotX++

    } else if (
        direction === "left" &&
        robotX > 0
    ) {

        robotX--

    } else if (
        direction === "down" &&
        robotY < gridSize - 1
    ) {

        robotY++

    } else if (
        direction === "up" &&
        robotY > 0
    ) {

        robotY--
    }
}


// ======================================================
// VIRAR DIREITA
// ======================================================

function turnRight() {

    if (direction === "right") {

        direction = "down"

    } else if (direction === "down") {

        direction = "left"

    } else if (direction === "left") {

        direction = "up"

    } else if (direction === "up") {

        direction = "right"
    }
}


// ======================================================
// VIRAR ESQUERDA
// ======================================================

function turnLeft() {

    if (direction === "right") {

        direction = "up"

    } else if (direction === "up") {

        direction = "left"

    } else if (direction === "left") {

        direction = "down"

    } else if (direction === "down") {

        direction = "right"
    }
}


// ======================================================
// VERIFICA SE CHEGOU EM UMA LÂMPADA
// ======================================================

function checkLightPosition() {

    const light =
        lights.find(
            lightItem =>
                lightItem.x === robotX &&
                lightItem.y === robotY
        )


    if (!light) {
        return null
    }


    // Se já respondeu essa lâmpada,
    // não mostra pergunta novamente.

    if (light.on) {
        return null
    }


    return light
}


// ======================================================
// ESCOLHE UMA PERGUNTA ALEATÓRIA
// ======================================================

function getRandomQuestion(light) {

    let availableQuestions =
        questionBank.filter(
            (_, index) =>
                !light.questionUsed.includes(index)
        )


    // Se todas já foram usadas,
    // libera o banco novamente.

    if (availableQuestions.length === 0) {

        light.questionUsed = []

        availableQuestions = [...questionBank]
    }


    const randomIndex =
        Math.floor(
            Math.random() *
            availableQuestions.length
        )


    const selected =
        availableQuestions[randomIndex]


    const originalIndex =
        questionBank.indexOf(selected)


    light.questionUsed.push(originalIndex)


    return selected
}


// ======================================================
// ABRE A PERGUNTA
// ======================================================

function openQuestion(light) {

    quizActive = true

    currentLight = light

    currentQuestion =
        getRandomQuestion(light)


    const modal =
        document.getElementById("question-modal")

    const questionText =
        document.getElementById("question-text")

    const optionsContainer =
        document.getElementById("question-options")

    const feedback =
        document.getElementById("question-feedback")


    questionText.textContent =
        currentQuestion.question


    optionsContainer.innerHTML = ""

    feedback.textContent = ""

    feedback.className =
        "question-feedback"


    currentQuestion.options.forEach(
        (option, index) => {

            const button =
                document.createElement("button")

            button.type = "button"

            button.textContent = option

            button.classList.add(
                "question-option"
            )


            button.onclick = () => {

                answerQuestion(index)

            }


            optionsContainer.appendChild(button)
        }
    )


    modal.classList.add("show")
}


// ======================================================
// RESPONDE A PERGUNTA
// ======================================================

function answerQuestion(selectedIndex) {

    if (!currentQuestion) {
        return
    }


    const feedback =
        document.getElementById(
            "question-feedback"
        )


    const buttons =
        document.querySelectorAll(
            ".question-option"
        )


    // -----------------------------
    // RESPOSTA CORRETA
    // -----------------------------

    if (
        selectedIndex ===
        currentQuestion.correct
    ) {

        feedback.textContent =
            "✓ Resposta correta!"

        feedback.classList.add("correct")


        buttons.forEach(button => {

            button.disabled = true

        })


        setTimeout(() => {

            currentLight.on = true

            closeQuestionModal()

            updateGrid()

            checkWin()

        }, 700)


        return
    }


    // -----------------------------
    // RESPOSTA ERRADA
    // -----------------------------

    feedback.textContent =
        "✕ Resposta incorreta! Tente outra."

    feedback.classList.add("wrong")


    buttons.forEach(button => {

        button.disabled = true

    })


    setTimeout(() => {

        openQuestion(currentLight)

    }, 700)
}


// ======================================================
// FECHA MODAL DA PERGUNTA
// ======================================================

function closeQuestionModal() {

    const modal =
        document.getElementById(
            "question-modal"
        )

    modal.classList.remove("show")

    quizActive = false

    currentQuestion = null

    currentLight = null


    if (questionResolver) {

        const resolve =
            questionResolver

        questionResolver = null

        resolve()
    }
}


// ======================================================
// ESPERA O JOGADOR RESPONDER
// ======================================================

function waitForQuestion(light) {

    return new Promise(resolve => {

        questionResolver = resolve

        openQuestion(light)

    })
}


// ======================================================
// VERIFICA A LÂMPADA ATUAL
// ======================================================

async function handleLight() {

    const light = checkLightPosition()


    if (!light) {
        return
    }


    await waitForQuestion(light)
}


// ======================================================
// EXECUTAR COMANDOS
// ======================================================

async function runCommands() {

    if (commands.length === 0) {

        alert(
            "Adicione comandos antes de executar."
        )

        return
    }


    if (running || quizActive) {
        return
    }


    running = true

    setControlsEnabled(false)


    for (const cmd of commands) {


        // -----------------------------
        // EXECUTA O COMANDO
        // -----------------------------

        if (cmd === "frente") {

            moveForward()

        } else if (cmd === "direita") {

            turnRight()

        } else if (cmd === "esquerda") {

            turnLeft()
        }


        updateGrid()


        // -----------------------------
        // VERIFICA LÂMPADA
        // -----------------------------

        const light =
            checkLightPosition()


        if (light) {

            await waitForQuestion(light)

            updateGrid()
        }


        // -----------------------------
        // VERIFICA VITÓRIA
        // -----------------------------

        if (
            lights.every(
                light => light.on
            )
        ) {

            commands = []

            updateStatus()

            running = false

            return
        }


        await new Promise(
            resolve =>
                setTimeout(resolve, 400)
        )
    }


    commands = []

    updateStatus()

    running = false

    setControlsEnabled(true)
}


// ======================================================
// VERIFICA VITÓRIA
// ======================================================

function checkWin() {

    const allLightsOn =
        lights.every(
            light => light.on
        )


    if (!allLightsOn) {

        return false
    }

    recordLevelCompletion(selectedLevel)


    running = false

    setControlsEnabled(false)


    setTimeout(() => {

        const modal =
            document.getElementById(
                "win-modal"
            )

        modal.classList.add("show")

    }, 300)


    return true
}


// ======================================================
// FECHA MODAL DE VITÓRIA
// ======================================================

function closeWinModal() {

    const modal =
        document.getElementById(
            "win-modal"
        )


    modal.classList.remove("show")


    setTimeout(() => {

        resetLevel()

        setControlsEnabled(true)

    }, 250)
}


// ======================================================
// REINICIAR FASE
// ======================================================

function resetLevel() {

    robotX = 0

    robotY = 0

    direction = "right"

    commands = []

    running = false

    quizActive = false

    currentQuestion = null

    currentLight = null

    questionResolver = null


    lights = [

        {
            x: 2,
            y: 1,
            on: false,
            questionUsed: []
        },

        {
            x: 4,
            y: 3,
            on: false,
            questionUsed: []
        }

    ]


    document
        .getElementById("question-modal")
        .classList.remove("show")


    document
        .getElementById("win-modal")
        .classList.remove("show")


    setControlsEnabled(true)

    updateGrid()
}


// ======================================================
// INICIA O JOGO
// ======================================================

createGrid()