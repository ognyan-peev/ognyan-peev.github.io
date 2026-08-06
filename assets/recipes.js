(() => {
  const categories = {
    starters: { title: 'Предястия', description: 'Домашни рецепти за трапезата, запазени от старите тефтерчета.' },
    mains: { title: 'Основни с месо', description: 'Семейни основни ястия, приготвяни през годините.' },
    desserts: { title: 'Десерти', description: 'Сладкиши, торти и дребни сладки с вкус от детството.' },
    drinks: { title: 'Напитки', description: 'Домашни напитки от семейната колекция.' },
    new: { title: 'Нови добавени', description: 'Всички рецепти, добавени в първото издание на кулинарната страница.' },
    favorites: { title: 'Любими / избрани', description: 'Тук ще подредим специално избраните семейни рецепти.' }
  };
  const params = new URLSearchParams(location.search);
  const requested = params.get('category') || 'new';
  const category = categories[requested] ? requested : 'new';
  const data = Array.isArray(window.RECIPE_DATA) ? window.RECIPE_DATA : [];
  const title = document.getElementById('categoryTitle');
  const description = document.getElementById('categoryDescription');
  const grid = document.getElementById('recipeGrid');
  const empty = document.getElementById('emptyRecipes');
  title.textContent = categories[category].title;
  description.textContent = categories[category].description;
  document.title = `${categories[category].title} | Семейни рецепти`;
  document.querySelectorAll('[data-category]').forEach(link => {
    link.classList.toggle('active', link.dataset.category === category);
  });

  let filtered;
  if (category === 'new') filtered = data.filter(r => r.new).sort((a,b) => b.order - a.order);
  else if (category === 'favorites') filtered = data.filter(r => r.favorite);
  else filtered = data.filter(r => r.category === category).sort((a,b) => a.order - b.order);

  if (!filtered.length) {
    empty.hidden = false;
    empty.innerHTML = category === 'favorites'
      ? '<strong>Все още няма избрани любими рецепти.</strong><br>Когато Огнян посочи кои да бъдат тук, ще ги добавим.'
      : 'В тази категория все още няма рецепти.';
  } else {
    const fragment = document.createDocumentFragment();
    filtered.forEach(recipe => {
      const card = document.createElement('a');
      card.className = 'recipe-card';
      card.href = `recipe.html?id=${encodeURIComponent(recipe.id)}&from=${encodeURIComponent(category)}`;
      card.innerHTML = `
        <span class="recipe-thumb"><img src="${recipe.thumb}" alt="${recipe.title}" loading="lazy" decoding="async"></span>
        <strong>${recipe.title}</strong>`;
      card.addEventListener('click', () => window.siteAnalytics?.event('open_recipe', {
        recipe_id: recipe.id, recipe_title: recipe.title, category
      }));
      fragment.appendChild(card);
    });
    grid.appendChild(fragment);
  }
  window.siteAnalytics?.event('view_recipe_category', {category, category_title: categories[category].title});
})();
