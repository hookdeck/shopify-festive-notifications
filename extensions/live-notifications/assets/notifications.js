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

// Create a decorative snowflake (original functionality)
const createSnowflake = () => {
  const flake = document.createElement("div");
  flake.classList.add("flake");
  container.appendChild(flake);
  ++snowCount;

  flake.addEventListener("click", () => {
    console.log("❄️ clicked");
  });
};

// Create a product notification snowflake with the product image
// Replacement for createProductSnowflake function
// Copy this into notifications.js replacing the current createProductSnowflake function

const createProductSnowflake = (imageUrl, productName) => {
  console.log("🔍 createProductSnowflake called with:", {
    imageUrl,
    productName,
  });

  const flake = document.createElement("div");
  flake.classList.add("flake");
  flake.classList.add("product-flake");

  // Position randomly and apply CSS animation
  const startX = Math.random() * 90 + 5; // 5-95vw
  const duration = 10 + Math.random() * 5; // 10-15s

  flake.style.left = `${startX}vw`;
  flake.style.animation = `productFall ${duration}s linear forwards`;

  console.log("🔍 Product flake animation:", {
    startX,
    duration,
  });

  // Add the product image
  if (imageUrl) {
    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = productName || "Product";
    img.onerror = () => {
      console.error("❌ Failed to load image:", imageUrl);
      flake.classList.add("no-image");
      flake.textContent = "🎁";
    };
    img.onload = () => {
      console.log("✅ Image loaded successfully:", imageUrl);
    };
    flake.appendChild(img);
  } else {
    console.warn("⚠️ No image URL provided, using fallback");
    flake.classList.add("no-image");
    flake.textContent = "🎁";
  }

  // Append to the snowfall container like decorative flakes
  container.appendChild(flake);
  console.log("✅ Product flake appended to container");

  flake.addEventListener("click", (e) => {
    console.log("🎁 Clicked product notification:", productName);
    flake.remove();
    e.stopPropagation();
  });

  // Auto-remove after animation completes
  setTimeout(
    () => {
      if (container.contains(flake)) {
        flake.remove();
        console.log("🧹 Product flake auto-removed after animation");
      }
    },
    duration * 1000 + 500,
  );

  console.log("🎉 Product snowflake created and animating from top!");
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

const createNotification = (orderData) => {
  console.log("Creating notification with data:", orderData);

  // Get the first line item for display
  const item = orderData.line_items && orderData.line_items[0];
  if (!item) {
    console.warn("No line items in order data");
    return;
  }

  // Create a product snowflake with the product image
  createProductSnowflake(item.image, item.name);

  // Create notification element
  const notification = document.createElement("div");
  notification.className = "order-notification";

  notification.innerHTML = `
    <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    <div class="notification-header">🎉 New Order!</div>
    <div class="notification-content">
      ${item.image ? `<img src="${item.image}" alt="${item.name}" class="notification-image">` : ""}
      <div class="notification-details">
        <div class="notification-product">${item.name}</div>
        <div class="notification-price">
          ${orderData.currency} $${item.price} × ${item.quantity}
        </div>
        <div class="notification-price">
          ${orderData.shop}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(notification);

  // Auto-remove after 10 seconds
  setTimeout(() => {
    notification.style.animation = "slideIn 0.3s ease-out reverse";
    setTimeout(() => notification.remove(), 300);
  }, 10000);
};

const connectAbly = async () => {
  const ably = new Ably.Realtime(
    "YSZP0A.hdhnVg:zIZPshl8siku5OJ-XG5iKZU0KRsEPalitmrejJ7KY5Q",
  );
  ably.connection.once("connected", () => {
    console.log("Connected to Ably!");
  });

  const channel = ably.channels.get("shopify-notifications");
  await channel.subscribe((message) => {
    console.log("Message received:", message);

    // The data is nested inside message.data.data from Hookdeck
    const orderData = message.data?.data || message.data;
    console.log("Order data:", orderData);

    if (orderData) {
      createNotification(orderData);
    }
  });
};

document.addEventListener("DOMContentLoaded", () => {
  console.log("Let it snow ❄️");
  while (snowCount < 200) {
    createSnowflake();
  }

  connectAbly();

  // TEST: Create product snowflakes every 3 seconds for testing
  console.log(
    "🧪 Starting test mode - creating product snowflakes every 3 seconds",
  );
  setInterval(() => {
    const testImage =
      "https://cdn.shopify.com/s/files/1/0713/1827/4268/files/unisex-staple-t-shirt-heather-midnight-navy-front-687a4ef6b87e0.jpg?v=1752846082";
    const testProduct = "Test Product " + Date.now();
    console.log("🧪 Creating test product snowflake");
    createProductSnowflake(testImage, testProduct);
  }, 3000);
});
