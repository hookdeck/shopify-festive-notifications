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

// const loadAbly = () => {
//   const script = document.createElement("script");
//   script.src = "https://cdn.ably.io/lib/ably.min-1.js";
//   script.onload = connectAbly;
//   document.head.appendChild(script);
// }

const connectAbly = async () => {
  const ably = new Ably.Realtime(
    "YSZP0A.hdhnVg:zIZPshl8siku5OJ-XG5iKZU0KRsEPalitmrejJ7KY5Q",
  );
  ably.connection.once("connected", () => {
    console.log("Connected to Ably!");
  });

  const channel = ably.channels.get("shopify-notifications");
  await channel.subscribe((message) => {
    console.log("Message received: " + message.data);
  });
};

document.addEventListener("DOMContentLoaded", () => {
  console.log("Let it snow ❄️");
  while (snowCount < 200) {
    createSnowflake();
  }

  connectAbly();
});
