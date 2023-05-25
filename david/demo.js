
// Define colors
const rgbToCoords = (r, g, b) => [r / 255.0, g / 255.0, b / 255.0];
const yellowish = new Color("srgb", rgbToCoords(255, 194, 10));
const blueish = new Color("srgb", rgbToCoords(12, 123, 220));
const minColor = new Color("white");
const maxColor = new Color("darkgray");

// Global for the Two canvas
const two = new Two({
                  fullscreen: false,
                  fitted: true,
                  autostart: true
}).appendTo(document.querySelector("#the-canvas"));

// 25x25 graph with random weights between 0..10
// zero is a wall
const gridWidth = 25;
const gridHeight = 25;

cols = Array.from({ length: gridWidth }, () => {
  return Array.from({ length: gridHeight }, () => Math.floor(Math.random() * 11));
});

graph = new Graph(cols);

// Infer square size from canvas dimensions
const squareSize = Math.min(two.width / gridWidth, two.height / gridHeight);
const squareWidth = squareSize, squareHeight = squareSize;

// Convert a grid coordinate to a screen coordinate.
const gridToScreen = function(gridX, gridY) {
  const centerScreenX = two.width / 2.0;
  const centerScreenY = two.height / 2.0;

  const centerGridX = gridWidth / 2;
  const centerGridY = gridHeight / 2;

  // Adjust 0,0 to be the top-left corner, not the center.
  const xOffset = gridX - centerGridX;
  const yOffset = gridY - centerGridY;
  
  return [
    centerScreenX + xOffset * squareWidth,
    centerScreenY + yOffset * squareHeight
  ];
};

// Find min & max weight for color gradient
const minWeight = Math.min(...graph.nodes.map(n => n.weight));
const maxWeight = Math.max(...graph.nodes.map(n => n.weight));

// Determine a square's fill color.
const squareToColor = function(square) {
  const colorRange = minColor.range(maxColor, { space: "srgb" });
  const weightPercent = (maxWeight == minWeight) ?
    1 :
    (square.weight - minWeight) / (maxWeight - minWeight);

  return square.weight == 0 ? [0, 0, 0] : colorRange(weightPercent).coords;
};

// Create a rectangle per grid square.

var board = Array.from({ length: gridWidth }, () => {
  return Array.from({ length: gridHeight });
});

// Hack: make sure start/end aren't walls.
const startNode = graph.grid[0][0];
const endNode = graph.grid[21][21];
startNode.weight = 1;
endNode.weight = 1;

graph.nodes.forEach(square => {
  const middleX = two.width / 2;
  const middleY = two.height / 2;
  
  const [squareX, squareY] = gridToScreen(square.x, square.y);

  const gridRect = two.makeRectangle(squareX - squareWidth * 0.5, squareY + squareHeight * 0.5, squareWidth, squareHeight);
  const [colorR, colorG, colorB] = squareToColor(square);
  gridRect.fill = `rgb(${colorR * 255}, ${colorG * 255}, ${colorB * 255})`;

  board[square.x][square.y] = gridRect;
});

let searchTickHold = null;
let lastSearchedSquare = null;

const tickCallback = async function(square) {
  // Highlight the current square
  const rect = board[square.x][square.y];
  rect.fill = `rgb(0, 255, 0)`;

  // Reset the previous square to its heuristic prediction
  if (lastSearchedSquare) {
    const rect = board[lastSearchedSquare.x][lastSearchedSquare.y];
    const percent = 1 - lastSearchedSquare.h / (gridWidth + gridHeight);
    rect.fill = `rgb(${Math.floor(percent * 255)}, 0, 0)`;
  }

  lastSearchedSquare = square;

  // Block further search until the tick hold is released.
  // (this happens in the Two animation frame)
  return new Promise(resolve => {
    searchTickHold = resolve;
  });
};

let lastTickFrameNum = null;

two.bind('update', function(currentFrameNum) {
  lastTickFrameNum = currentFrameNum;

  if (searchTickHold) {
    searchTickHold();
    searchTickHold = null;
  }
});

function main() {
  //const tickCallback = () => { console.log('tick!'); };

  // Solve the path.
  result = astar.searchAsync(graph, startNode, endNode, {
    tickFunction: tickCallback,
    heuristic: astar.heuristics.manhattan,
  });

  /*
  result.forEach(step => {
    const gridRect = board[step.x][step.y];
    gridRect.fill = 'rgb(0, 0, 255)';
  });
  */

  // When the path is available, draw it.
  result.then( (steps) => {
    steps.forEach(step => {
      const gridRect = board[step.x][step.y];
      gridRect.fill = 'rgb(0, 0, 255)';
    });
  });
}

main();

