(() => {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const from = params.get('from') || 'new';
  const data = Array.isArray(window.RECIPE_DATA) ? window.RECIPE_DATA : [];
  const recipe = data.find(r => r.id === id);
  const title = document.getElementById('recipeTitle');
  const image = document.getElementById('recipeImage');
  const backUrl = `recipes.html?category=${encodeURIComponent(from)}`;
  document.getElementById('backLink').href = backUrl;
  document.getElementById('backLinkBottom').href = backUrl;
  if (!recipe) {
    title.textContent = 'Рецептата не е намерена';
    image.remove();
    return;
  }
  title.textContent = recipe.title;
  image.src = recipe.image;
  image.alt = recipe.title;
  document.title = `${recipe.title} | Семейни рецепти`;
  window.siteAnalytics?.event('view_recipe', {
    recipe_id: recipe.id, recipe_title: recipe.title, category: recipe.category
  });
})();
