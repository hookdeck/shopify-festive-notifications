/** Lights **/

const bulbs = document.getElementsByClassName("bulb");
for (var i = 0; i < bulbs.length; i++) {
  const bulb = bulbs[i];
  bulb.addEventListener("click", () => {
    console.log("💡 clicked");
    bulb.classList.toggle("lit");
  });
}

/** Snowfall **/

let snowCount = 0;
const container = document.getElementById("notifications_snowfall");
const createSnowflake = () => {
  const flake = document.createElement("div");
  flake.classList.add("flake");
  container.appendChild(flake);
  ++snowCount;

  flake.addEventListener("click", () => {
    console.log("❄️ clicked");
  });
};

// const snowTick = () => {
//   if (snowCount < 200) {
//     createSnowflake();
//     setTimeout(snowTick, 100);
//   }
// };

// snowTick();

document.addEventListener("DOMContentLoaded", () => {
  console.log("Let it snow ❄️");
  while (snowCount < 200) {
    createSnowflake();
  }
});
