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

let lights = [
  { x: 2, y: 1, on: false },
  { x: 4, y: 3, on: false }
]

let robotX = 0
let robotY = 0
let direction = "right"
let commands = []
let running = false

function createGrid() {
  grid.innerHTML = ""

  for (let i = 0; i < gridSize * gridSize; i++) {
    const tile = document.createElement("div")
    tile.classList.add("tile")
    grid.appendChild(tile)
  }

  updateGrid()
}

function updateGrid() {
  const tiles = document.querySelectorAll(".tile")

  tiles.forEach((tile, index) => {
    tile.className = "tile"
    tile.innerHTML = ""

    const x = index % gridSize
    const y = Math.floor(index / gridSize)
    const light = lights.find((lightItem) => lightItem.x === x && lightItem.y === y)

    if (light) {
      tile.classList.add(light.on ? "light-on" : "light-off")
    }

    if (x === robotX && y === robotY) {
      tile.classList.add("robot")
      tile.innerHTML = "<img src=\"./assets/robot.svg\" alt=\"Lightbot\" class=\"robot-icon\" />"
    }
  })

  updateStatus()
}

function updateStatus() {
  directionDisplay.textContent = `Direção: ${arrows[direction]}`
  positionDisplay.textContent = `Posição: ${robotX},${robotY}`
  const countEl = document.getElementById('command-count')
  const previewEl = document.getElementById('command-preview')

  if (commands.length === 0) {
    countEl.textContent = 'Comandos: 0'
    previewEl.textContent = ''
  } else {
    countEl.textContent = `Comandos: ${commands.length}`
    const preview = commands.slice(0, 6).join(' • ')
    previewEl.textContent = preview + (commands.length > 6 ? ' • …' : '')
  }
}

function addCommand(cmd) {
  commands.push(cmd)
  updateStatus()
}

function addSelectedCommands() {
  const selector = document.getElementById("command-selector")
  const selectedValues = Array.from(selector.selectedOptions).map((option) => option.value)

  if (selectedValues.length === 0) {
    alert("Selecione pelo menos um comando para adicionar.")
    return
  }

  commands.push(...selectedValues)
  selector.selectedIndex = -1
  updateStatus()
}

function clearCommands() {
  commands = []
  updateStatus()
}

function setControlsEnabled(enabled) {
  const controls = document.querySelectorAll('.control-buttons button, #command-text, #command-input button')
  controls.forEach(el => { el.disabled = !enabled })
}

function stepMove(dir) {
  if (running) return

  // map arrow-like directions to robot orientation
  if (dir === 'up') direction = 'up'
  else if (dir === 'down') direction = 'down'
  else if (dir === 'left') direction = 'left'
  else if (dir === 'right') direction = 'right'

  moveForward()
  lightTile()
  updateGrid()
}

// keyboard support for arrow keys
document.addEventListener('keydown', (e) => {
  if (running) return
  if (e.key === 'ArrowUp') stepMove('up')
  else if (e.key === 'ArrowDown') stepMove('down')
  else if (e.key === 'ArrowLeft') stepMove('left')
  else if (e.key === 'ArrowRight') stepMove('right')
})

function addCommandList() {
  const text = document.getElementById("command-text").value.trim()

  if (!text) {
    alert("Digite pelo menos um comando.")
    return
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-*\s]+/, ""))
    .filter(Boolean)
    .map((line) => line.toLowerCase())

  const allowed = ["frente", "direita", "esquerda"]
  const invalid = lines.filter((line) => !allowed.includes(line))

  if (invalid.length > 0) {
    alert(`Comando inválido: ${invalid[0]}. Use frente, direita ou esquerda.`)
    return
  }

  commands.push(...lines)
  document.getElementById("command-text").value = ""
  updateStatus()
}

function toggleCommandEditor() {
  const el = document.getElementById('command-input')
  el.classList.toggle('hidden')
  const btn = document.getElementById('toggle-editor')
  btn.textContent = el.classList.contains('hidden') ? 'Editar' : 'Fechar'
}

function moveForward() {
  if (direction === "right" && robotX < gridSize - 1) {
    robotX++
  } else if (direction === "left" && robotX > 0) {
    robotX--
  } else if (direction === "down" && robotY < gridSize - 1) {
    robotY++
  } else if (direction === "up" && robotY > 0) {
    robotY--
  }
}

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

function lightTile() {
    lights.forEach((light) => {
        if (light.x === robotX && light.y === robotY) {
            light.on = true
        }
    })

    checkWin()
}

async function runCommands() {
    if (commands.length === 0) {
        alert("Adicione comandos antes de executar.")
        return
    }

    running = true
    setControlsEnabled(false)

    for (const cmd of commands) {
        if (cmd === "frente") {
            moveForward()
        } else if (cmd === "direita") {
            turnRight()
        } else if (cmd === "esquerda") {
            turnLeft()
        }

        lightTile()
        updateGrid()

        if (lights.every((light) => light.on)) {
            commands = []
            updateStatus()
            return
        }

        await new Promise((resolve) => setTimeout(resolve, 400))
    }

    commands = []
    updateStatus()
    running = false
    setControlsEnabled(true)
}

function resetLevel() {
  robotX = 0
  robotY = 0
  direction = "right"
  commands = []
  lights = [
    { x: 2, y: 1, on: false },
    { x: 4, y: 3, on: false }
  ]

  updateGrid()
}

function checkWin() {
    const allLightsOn = lights.every((light) => light.on)

    if (allLightsOn) {
        running = false
        setControlsEnabled(false)

        setTimeout(() => {
            const modal = document.getElementById("win-modal")
            modal.classList.add("show")
        }, 300)

        return true
    }

    return false
}

function closeWinModal() {
    const modal = document.getElementById("win-modal")

    modal.classList.remove("show")

    setTimeout(() => {
        resetLevel()
        setControlsEnabled(true)
    }, 250)
}

createGrid()