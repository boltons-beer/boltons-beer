document.addEventListener("DOMContentLoaded", function () {
  // Add click event to all 'View Details' buttons
  document.querySelectorAll(".view-details").forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      const card = this.closest(".product-card");
      card.classList.add("flipped");
    });
  });

  // Add click event to all 'Back to Beer' buttons
  document.querySelectorAll(".back-to-front").forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      const card = this.closest(".product-card");
      card.classList.remove("flipped");
    });
  });

  // Close card when clicking outside on mobile
  document.addEventListener("click", function (e) {
    if (window.innerWidth <= 768) {
      const cards = document.querySelectorAll(".product-card");
      cards.forEach((card) => {
        if (!card.contains(e.target) && card.classList.contains("flipped")) {
          card.classList.remove("flipped");
        }
      });
    }
  });
});
