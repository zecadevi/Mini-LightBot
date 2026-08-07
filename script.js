
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

function startGame(level) {
    selectedLevel = level

    const startScreen = document.getElementById("start-screen")
    const gameScreen = document.getElementById("game-screen")

    startScreen.classList.add("hidden")
    gameScreen.classList.remove("hidden")

    resetLevel()
}





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
// TECLADO
// ======================================================

document.addEventListener("keydown", (e) => {

    if (running || quizActive) {
        return
    }


    if (e.key === "ArrowUp") {

        stepMove("up")

    } else if (e.key === "ArrowDown") {

        stepMove("down")

    } else if (e.key === "ArrowLeft") {

        stepMove("left")

    } else if (e.key === "ArrowRight") {

        stepMove("right")

    }

})


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