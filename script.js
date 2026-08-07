
let robotX = 0
let robotY = 0
let commands = []

const grid = document.getElementById("grid")

function createGrid(){
  for(let i=0;i<25;i++){
    const tile = document.createElement("div")
    tile.classList.add("tile")
    grid.appendChild(tile)
  }
  drawRobot()
}

function drawRobot(){
  const tiles = document.querySelectorAll(".tile")
  tiles.forEach(t => t.classList.remove("robot"))

  const index = robotY * 5 + robotX
  tiles[index].classList.add("robot")
}

function addCommand(cmd){
  commands.push(cmd)
}

async function runCommands(){
  for(let cmd of commands){

    if(cmd === "frente"){
      robotX++
    }

    drawRobot()

    await new Promise(r => setTimeout(r,500))
  }

  commands = []
}

createGrid()

