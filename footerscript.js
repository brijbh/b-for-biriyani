document.addEventListener('DOMContentLoaded', function() {
    const didYouKnowBtn = document.getElementById('did-you-know-btn');
    const recipeOfTheDayBtn = document.getElementById('recipe-of-the-day-btn');
    const popup = document.getElementById('popup');
    const popupText = document.getElementById('popup-text');
    const popupCloseBtn = document.getElementById('popup-close-btn');

    let didYouKnowFacts = [];
    let biryaniRecipes = [];

    // Fetch Did You Know Facts
    fetch('didYouKnow.json')
        .then(response => response.json())
        .then(data => {
            didYouKnowFacts = data.facts;
        })
        .catch(error => console.error('Error loading Did You Know facts:', error));

    // Fetch Biryani Recipes
    fetch('biryaniRecipes.json')
        .then(response => response.json())
        .then(data => {
            biryaniRecipes = data.recipes;
        })
        .catch(error => console.error('Error loading Biryani recipes:', error));

    function showPopup(content) {
        popupText.innerText = content;
        popup.classList.remove('hidden');
    }

    didYouKnowBtn.addEventListener('click', function() {
        if (didYouKnowFacts.length > 0) {
            const randomFact = didYouKnowFacts[Math.floor(Math.random() * didYouKnowFacts.length)];
            showPopup(randomFact);
        }
    });

    recipeOfTheDayBtn.addEventListener('click', function() {
        if (biryaniRecipes.length > 0) {
            const randomRecipe = biryaniRecipes[Math.floor(Math.random() * biryaniRecipes.length)];
            showPopup(randomRecipe);
        }
    });

    popupCloseBtn.addEventListener('click', function() {
        popup.classList.add('hidden');
    });
});
