import challenges from './manifest-challenges.json';

// Names match the printed manifest. Its two multimodal entries need distinct values.
export function populateChallenges(select, description, current = '') {
  select.replaceChildren(new Option('No manifest item selected', ''));
  const tasks = new Map();
  for (const side of ['front', 'back']) {
    const group = document.createElement('optgroup');
    group.label = `Manifest ${side}`;
    for (const challenge of challenges.filter(item => item.side === side)) {
      const value = challenge.name === 'multimodal'
        ? `${challenge.name} (${side})` : challenge.name;
      group.append(new Option(value, value));
      tasks.set(value, challenge.task);
    }
    select.append(group);
  }
  // Keep existing submissions editable without silently replacing their challenge.
  if (current && !tasks.has(current)) {
    select.append(new Option(`Previously entered: ${current}`, current));
  }
  select.value = current;
  if (description) {
    const update = () => { description.textContent = tasks.get(select.value) || ''; };
    select.addEventListener('change', update);
    select.form?.addEventListener('reset', () => { description.textContent = ''; });
    update();
  }
}
