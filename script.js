
let selectedLevel = null

const levelSettings = {
    facil: {
        label: "Fácil",
        lamps: [
            { x: 2, y: 1 },
            { x: 4, y: 3 }
        ]
    },
    medio: {
        label: "Médio",
        lamps: [
            { x: 2, y: 1 },
            { x: 4, y: 3 },
            { x: 1, y: 3 },
            { x: 3, y: 4 },
            { x: 4, y: 0 }
        ]
    },
    dificil: {
        label: "Difícil",
        lamps: [
            { x: 2, y: 1 },
            { x: 4, y: 3 },
            { x: 0, y: 2 },
            { x: 2, y: 2 },
            { x: 3, y: 2 },
            { x: 1, y: 4 },
            { x: 2, y: 4 },
            { x: 0, y: 4 },
            { x: 1, y: 0 },
            { x: 3, y: 0 },
            { x: 4, y: 1 }
        ]
    }
}

function createLightsForLevel(level) {
    const settings = levelSettings[level]
    return settings.lamps.map(({ x, y }) => ({ x, y, on: false }))
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
    return index === 0 || (index > 0 && completedLevels.includes(levelSequence[index - 1]))
}

function renderLevelSelection() {
    const cards = document.querySelectorAll("#level-screen .level-card")

    cards.forEach(card => {
        const level = card.dataset.level
        const unlocked = isLevelUnlocked(level)
        const lock = card.querySelector(".level-lock")
        const count = card.querySelector(".level-card-count")
        const lampCount = levelSettings[level]?.lamps.length ?? 0

        card.disabled = !unlocked
        card.setAttribute("aria-disabled", String(!unlocked))
        card.classList.toggle("is-locked", !unlocked)
        if (lock) lock.hidden = unlocked
        if (count) count.firstChild.textContent = `${String(lampCount).padStart(2, "0")} `
    })
}

function mountSelectionRobot() {
    const source = document.querySelector("#start-screen .hero-robot")
    const mount = document.getElementById("level-robot")
    if (!source || !mount || mount.childElementCount) return

    const robot = source.cloneNode(true)
    robot.classList.add("level-hero-robot")
    robot.setAttribute("focusable", "false")

    const elementsWithIds = Array.from(robot.querySelectorAll("[id]"))
    const idMap = new Map(
        elementsWithIds.map(element => [element.id, `selection-${element.id}`])
    )

    elementsWithIds.forEach(element => {
        element.id = idMap.get(element.id)
    })

    robot.querySelectorAll("*").forEach(element => {
        Array.from(element.attributes).forEach(attribute => {
            const updatedValue = attribute.value
                .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${idMap.get(id) || id})`)
                .replace(/^#(.+)$/, (_, id) => `#${idMap.get(id) || id}`)

            if (updatedValue !== attribute.value) {
                element.setAttribute(attribute.name, updatedValue)
            }
        })
    })

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
    if (!levelSettings[level] || !isLevelUnlocked(level)) return

    selectedLevel = level
    changeMusicStage(`game-${level}`)

    const startScreen = document.getElementById("start-screen")
    const levelScreen = document.getElementById("level-screen")
    const gameScreen = document.getElementById("game-screen")

    if (startScreen) startScreen.classList.add("hidden")
    if (levelScreen) levelScreen.classList.add("hidden")
    if (!gameScreen) return
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

let lights = createLightsForLevel("facil")


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
let usedQuestionIds = []
let answerTimer = null
let winTimer = null


// ======================================================
// BANCO DE PERGUNTAS POR DIFICULDADE
// ======================================================

const questionBanks = {
    facil: [
        {
            question: "O que significa HTML?",
            options: ["HyperText Markup Language", "HighText Machine Language", "HyperTool Multi Language", "HomeText Markup Language"],
            correct: 0,
            explanation: "HTML é a linguagem de marcação usada para estruturar o conteúdo de páginas web."
        },
        {
            question: "Qual tecnologia define principalmente a aparência de uma página web?",
            options: ["HTML", "CSS", "JavaScript", "SQL"],
            correct: 1,
            explanation: "CSS controla a apresentação visual, como cores, fontes e espaçamentos."
        },
        {
            question: "Qual linguagem é usada para criar interações em páginas web?",
            options: ["SQL", "HTML", "JavaScript", "CSS"],
            correct: 2,
            explanation: "JavaScript permite implementar comportamentos e interações no navegador."
        },
        {
            question: "Qual tipo de dado representa verdadeiro ou falso?",
            options: ["Texto", "Número", "Lista", "Booleano"],
            correct: 3,
            explanation: "Valores booleanos representam uma das duas possibilidades: verdadeiro ou falso."
        },
        {
            question: "Qual destes programas é um navegador de internet?",
            options: ["MySQL", "Firefox", "Git", "Windows"],
            correct: 1,
            explanation: "Firefox é um navegador usado para acessar páginas e aplicações web."
        },
        {
            question: "Qual comando JavaScript exibe uma mensagem no console?",
            options: ["show()", "print.page()", "console.log()", "message()"],
            correct: 2,
            explanation: "console.log() escreve valores no console de desenvolvimento do navegador."
        },
        {
            question: "Qual elemento HTML representa o título principal de uma página?",
            options: ["<h1>", "<p>", "<img>", "<footer>"],
            correct: 0,
            explanation: "O elemento h1 identifica o título de maior nível da página."
        },
        {
            question: "Qual destes valores é um número?",
            options: ["'42'", "42", "true", "azul"],
            correct: 1,
            explanation: "Sem aspas, 42 é um valor numérico; entre aspas seria texto."
        },
        {
            question: "Qual estrutura permite repetir instruções em um programa?",
            options: ["if", "return", "for", "const"],
            correct: 2,
            explanation: "Laços como for repetem um bloco de instruções de acordo com uma condição."
        },
        {
            question: "Qual atributo de um link HTML indica o endereço de destino?",
            options: ["src", "alt", "class", "href"],
            correct: 3,
            explanation: "O atributo href informa para qual endereço o link deve navegar."
        },
        {
            question: "Qual extensão é normalmente usada em arquivos JavaScript?",
            options: [".js", ".css", ".html", ".jpg"],
            correct: 0,
            explanation: "Arquivos com código JavaScript normalmente usam a extensão .js."
        },
        {
            question: "Qual dispositivo encaminha dados entre redes, como a rede doméstica e a internet?",
            options: ["Monitor", "Roteador", "Teclado", "Impressora"],
            correct: 1,
            explanation: "O roteador encaminha o tráfego entre dispositivos e redes."
        }
    ],
    medio: [
        {
            question: "Qual linguagem é executada principalmente no navegador para criar interações em páginas web?",
            options: ["JavaScript", "SQL", "Python", "C"],
            correct: 0,
            explanation: "JavaScript é executado no navegador para implementar interações e lógica de interface."
        },
        {
            question: "Qual propriedade CSS altera a cor de fundo de um elemento?",
            options: ["background-color", "font-color", "color-background", "bg-color"],
            correct: 0,
            explanation: "A propriedade background-color define a cor de fundo; color define a cor do texto."
        },
        {
            question: "Qual destas opções representa uma estrutura de repetição?",
            options: ["for", "const", "return", "import"],
            correct: 0,
            explanation: "for é um laço que executa instruções repetidamente."
        },
        {
            question: "Qual palavra-chave declara uma variável que não pode ser reatribuída?",
            options: ["const", "let", "var", "static"],
            correct: 0,
            explanation: "Uma variável declarada com const não pode receber outra atribuição."
        },
        {
            question: "Qual tecnologia estrutura o conteúdo de uma página web?",
            options: ["HTML", "CSS", "JavaScript", "SQL"],
            correct: 0,
            explanation: "HTML organiza elementos e conteúdo da página."
        },
        {
            question: "O que é uma função em programação?",
            options: ["Um bloco de código criado para executar uma tarefa", "Um tipo de banco de dados", "Um arquivo de imagem", "Um sistema operacional"],
            correct: 0,
            explanation: "Uma função agrupa instruções para executar uma tarefa e pode receber dados."
        },
        {
            question: "Qual destas opções é um sistema de gerenciamento de banco de dados?",
            options: ["MySQL", "HTML", "CSS", "Git"],
            correct: 0,
            explanation: "MySQL é um sistema de gerenciamento de banco de dados relacional."
        },
        {
            question: "Qual comando Git envia commits para um repositório remoto?",
            options: ["git push", "git pull", "git clone", "git init"],
            correct: 0,
            explanation: "git push envia os commits locais para um repositório remoto."
        },
        {
            question: "Qual tecnologia é responsável principalmente pelo estilo visual de uma página?",
            options: ["CSS", "HTML", "SQL", "JSON"],
            correct: 0,
            explanation: "CSS define estilos visuais como cores, tipografia e layout."
        },
        {
            question: "O que significa API?",
            options: ["Application Programming Interface", "Advanced Programming Internet", "Application Process Integration", "Automated Program Interface"],
            correct: 0,
            explanation: "Uma API define uma interface para que sistemas ou componentes troquem informações."
        },
        {
            question: "Qual estrutura JavaScript permite executar um bloco apenas quando uma condição é verdadeira?",
            options: ["if", "for", "import", "break"],
            correct: 0,
            explanation: "if avalia uma condição e executa seu bloco quando o resultado é verdadeiro."
        },
        {
            question: "Para que serve JSON em aplicações web?",
            options: ["Representar e trocar dados estruturados", "Estilizar páginas", "Editar imagens", "Compilar JavaScript"],
            correct: 0,
            explanation: "JSON é um formato textual comum para representar e trocar dados estruturados."
        }
    ],
    dificil: [
        {
            question: "Qual declaração JavaScript define uma função chamada soma que recebe dois parâmetros?",
            options: ["soma function(a, b)", "function soma = (a, b)", "function soma(a, b)", "def soma(a, b)"],
            correct: 2,
            explanation: "A sintaxe function soma(a, b) declara uma função com dois parâmetros."
        },
        {
            question: "Em JavaScript, qual é o índice do primeiro elemento de um array?",
            options: ["1", "-1", "Depende do tamanho", "0"],
            correct: 3,
            explanation: "Os índices de arrays JavaScript começam em zero."
        },
        {
            question: "O que significa o código de status HTTP 404?",
            options: ["Acesso autorizado", "Recurso não encontrado", "Erro interno do servidor", "Solicitação concluída"],
            correct: 1,
            explanation: "HTTP 404 indica que o servidor não encontrou o recurso solicitado."
        },
        {
            question: "Qual comando SQL consulta registros de uma tabela?",
            options: ["SELECT", "UPDATE", "INSERT", "DROP"],
            correct: 0,
            explanation: "SELECT recupera dados de uma ou mais tabelas."
        },
        {
            question: "Para que serve uma branch no Git?",
            options: ["Apagar o histórico", "Instalar dependências", "Desenvolver uma linha de trabalho isolada", "Publicar uma página"],
            correct: 2,
            explanation: "Uma branch permite desenvolver alterações em uma linha de trabalho separada."
        },
        {
            question: "Qual é a finalidade de uma chave primária em uma tabela relacional?",
            options: ["Armazenar arquivos", "Identificar unicamente cada registro", "Ordenar automaticamente todas as colunas", "Criptografar os dados"],
            correct: 1,
            explanation: "A chave primária identifica cada registro e não deve se repetir."
        },
        {
            question: "Qual método HTTP é normalmente usado para solicitar a leitura de um recurso?",
            options: ["POST", "DELETE", "GET", "PATCH"],
            correct: 2,
            explanation: "GET solicita a representação de um recurso sem ter como objetivo alterá-lo."
        },
        {
            question: "Em CSS, qual seletor tem maior especificidade entre estas opções?",
            options: [".menu", "div", "#menu", "*"],
            correct: 2,
            explanation: "Um seletor de ID tem maior especificidade que seletores de classe, elemento ou universal."
        },
        {
            question: "Qual serviço traduz nomes de domínio em endereços IP?",
            options: ["DHCP", "FTP", "SMTP", "DNS"],
            correct: 3,
            explanation: "O DNS resolve nomes de domínio para os endereços usados na comunicação de rede."
        },
        {
            question: "Qual elemento HTML semântico costuma agrupar os principais links de navegação?",
            options: ["<nav>", "<span>", "<aside>", "<figure>"],
            correct: 0,
            explanation: "O elemento nav identifica uma área de navegação, ajudando estrutura e tecnologias assistivas."
        },
        {
            question: "Se um algoritmo percorre uma lista uma única vez, qual é sua complexidade temporal típica?",
            options: ["O(1)", "O(n)", "O(n²)", "O(2ⁿ)"],
            correct: 1,
            explanation: "Uma passagem proporcional ao número de elementos tem crescimento linear, O(n)."
        },
        {
            question: "Qual protocolo protege a comunicação web com criptografia TLS?",
            options: ["HTTP", "FTP", "HTTPS", "Telnet"],
            correct: 2,
            explanation: "HTTPS usa TLS para proteger a comunicação entre o navegador e o servidor."
        }
    ]
}


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

    const lampProgress = document.getElementById("lamp-progress")
    const litLamps = lights.filter(light => light.on).length
    if (lampProgress) {
        lampProgress.textContent = `Lâmpadas: ${litLamps}/${lights.length}`
    }

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

    if (!["frente", "direita", "esquerda"].includes(cmd)) {
        return
    }

    commands.push(cmd)

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

function shuffleQuestionOptions(question) {
    const options = question.options.map((text, index) => ({
        text,
        correct: index === question.correct
    }))

    for (let index = options.length - 1; index > 0; index--) {
        const randomIndex = Math.floor(Math.random() * (index + 1))
        const currentOption = options[index]
        options[index] = options[randomIndex]
        options[randomIndex] = currentOption
    }

    return {
        ...question,
        options: options.map(option => option.text),
        correct: options.findIndex(option => option.correct)
    }
}

function getRandomQuestion() {
    const bank = questionBanks[selectedLevel]
    if (!bank || bank.length === 0) {
        throw new Error(`Nenhuma pergunta cadastrada para o nível "${selectedLevel}".`)
    }

    let availableQuestionIds = bank
        .map((_, index) => index)
        .filter(index => !usedQuestionIds.includes(index))

    if (availableQuestionIds.length === 0) {
        usedQuestionIds = []
        availableQuestionIds = bank.map((_, index) => index)
    }

    const questionId = availableQuestionIds[
        Math.floor(Math.random() * availableQuestionIds.length)
    ]
    usedQuestionIds.push(questionId)

    return shuffleQuestionOptions(bank[questionId])
}


// ======================================================
// ABRE A PERGUNTA
// ======================================================

function openQuestion(light) {

    quizActive = true

    currentLight = light

    currentQuestion = getRandomQuestion()


    const modal =
        document.getElementById("question-modal")

    const difficulty =
        document.getElementById("question-difficulty")

    const questionText =
        document.getElementById("question-text")

    const optionsContainer =
        document.getElementById("question-options")

    const feedback =
        document.getElementById("question-feedback")


    difficulty.textContent = `TI • ${levelSettings[selectedLevel].label}`
    questionText.textContent =
        currentQuestion.question


    optionsContainer.innerHTML = ""

    feedback.textContent = ""

    feedback.className =
        "question-feedback"


    currentQuestion.options.forEach((option, index) => {

        const button = document.createElement("button")

        button.type = "button"

        button.textContent = option

        button.classList.add("question-option")

        button.addEventListener("click", () => answerQuestion(index))

        optionsContainer.appendChild(button)
    })

    modal.setAttribute("aria-hidden", "false")
    modal.classList.add("show")
    optionsContainer.querySelector("button")?.focus()
}


// ======================================================
// RESPONDE A PERGUNTA
// ======================================================

function answerQuestion(selectedIndex) {

    if (!currentQuestion || !currentLight) {
        return
    }

    window.clearTimeout(answerTimer)
    const question = currentQuestion
    const light = currentLight

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
        selectedIndex === question.correct
    ) {

        feedback.textContent = `✓ Resposta correta! ${question.explanation}`

        feedback.classList.add("correct")


        buttons.forEach(button => {

            button.disabled = true

        })


        answerTimer = window.setTimeout(() => {
            if (currentQuestion !== question || currentLight !== light) return

            light.on = true
            closeQuestionModal()
            updateGrid()
            checkWin()
        }, 1100)

        return
    }


    // -----------------------------
    // RESPOSTA ERRADA
    // -----------------------------

    feedback.textContent = `Resposta incorreta. ${question.explanation} Você receberá outra questão para tentar acender esta lâmpada.`

    feedback.classList.add("wrong")


    buttons.forEach(button => {

        button.disabled = true

    })


    answerTimer = window.setTimeout(() => {
        if (currentQuestion !== question || currentLight !== light) return
        openQuestion(light)
    }, 1800)
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
    modal.setAttribute("aria-hidden", "true")
    window.clearTimeout(answerTimer)
    answerTimer = null

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


    if (!allLightsOn || !levelSettings[selectedLevel]) {

        return false
    }

    recordLevelCompletion(selectedLevel)


    running = false

    setControlsEnabled(false)


    const modal = document.getElementById("win-modal")
    const message = document.getElementById("win-message")
    const nextLevel = levelSequence[levelSequence.indexOf(selectedLevel) + 1]

    message.textContent = nextLevel
        ? `Você acendeu todas as ${lights.length} lâmpadas do nível ${levelSettings[selectedLevel].label}. O nível ${levelSettings[nextLevel].label} foi desbloqueado!`
        : `Você acendeu todas as ${lights.length} lâmpadas do nível ${levelSettings[selectedLevel].label}. Parabéns por concluir todos os níveis!`

    window.clearTimeout(winTimer)
    winTimer = window.setTimeout(() => {
        modal.setAttribute("aria-hidden", "false")
        modal.classList.add("show")
        document.getElementById("win-confirm-button").focus()
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
    modal.setAttribute("aria-hidden", "true")

    window.setTimeout(() => {

        resetLevel()

    }, 250)
}


// ======================================================
// REINICIAR FASE
// ======================================================

function resetLevel() {
    if (!levelSettings[selectedLevel]) return

    window.clearTimeout(answerTimer)
    window.clearTimeout(winTimer)
    answerTimer = null
    winTimer = null

    robotX = 0

    robotY = 0

    direction = "right"

    commands = []

    running = false

    quizActive = false

    currentQuestion = null

    currentLight = null

    questionResolver = null


    lights = createLightsForLevel(selectedLevel)
    usedQuestionIds = []


    const questionModal = document.getElementById("question-modal")
    questionModal.classList.remove("show")
    questionModal.setAttribute("aria-hidden", "true")

    const winModal = document.getElementById("win-modal")
    winModal.classList.remove("show")
    winModal.setAttribute("aria-hidden", "true")


    setControlsEnabled(true)

    updateGrid()
}


// ======================================================
// INICIA O JOGO
// ======================================================

createGrid()