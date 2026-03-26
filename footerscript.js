document.addEventListener("DOMContentLoaded", () => {
    const didYouKnowBtn = document.getElementById("did-you-know-btn");
    const recipeOfTheDayBtn = document.getElementById("recipe-of-the-day-btn");
    const popup = document.getElementById("popup");
    const popupText = document.getElementById("popup-text");
    const popupCloseBtn = document.getElementById("popup-close-btn");
    const popupShareBtn = document.getElementById("popup-share-btn");

    let didYouKnowFacts = [];
    let biryaniRecipes = [];
    let currentPopupContent = "";

    fetch("didYouKnow.json")
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load facts (${response.status}).`);
            }
            return response.json();
        })
        .then(data => {
            didYouKnowFacts = Array.isArray(data.facts) ? data.facts : [];
        })
        .catch(error => console.error("Error loading Did You Know facts:", error));

    fetch("biryaniRecipes.json")
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load recipes (${response.status}).`);
            }
            return response.json();
        })
        .then(data => {
            biryaniRecipes = Array.isArray(data.recipes) ? data.recipes : [];
        })
        .catch(error => console.error("Error loading Biryani recipes:", error));

    function showPopup(content) {
        currentPopupContent = content;
        popupText.textContent = content;
        popup.classList.remove("hidden");
    }

    function closePopup() {
        popup.classList.add("hidden");
    }

    didYouKnowBtn.addEventListener("click", () => {
        if (didYouKnowFacts.length > 0) {
            const randomFact = didYouKnowFacts[Math.floor(Math.random() * didYouKnowFacts.length)];
            showPopup(randomFact);
        }
    });

    recipeOfTheDayBtn.addEventListener("click", () => {
        if (biryaniRecipes.length > 0) {
            const randomRecipe = biryaniRecipes[Math.floor(Math.random() * biryaniRecipes.length)];
            showPopup(randomRecipe);
        }
    });

    popupCloseBtn.addEventListener("click", closePopup);

    popupShareBtn.addEventListener("click", async () => {
        if (!currentPopupContent) {
            return;
        }

        try {
            if (navigator.share) {
                await navigator.share({
                    title: "B for Biriyani",
                    text: currentPopupContent
                });
                return;
            }

            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(currentPopupContent);
                popupShareBtn.textContent = "Copied";
                window.setTimeout(() => {
                    popupShareBtn.textContent = "Share";
                }, 1500);
            }
        } catch (error) {
            console.error("Error sharing popup content:", error);
        }
    });

    popup.addEventListener("click", event => {
        if (event.target === popup) {
            closePopup();
        }
    });
});
