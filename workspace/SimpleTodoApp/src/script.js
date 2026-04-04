document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('new-todo');
    const addBtn = document.getElementById('add-todo');
    const list = document.getElementById('todo-list');

    const addTodo = () => {
        const text = input.value.trim();
        if (text === '') return;

        const li = document.createElement('li');
        li.textContent = text;
        list.appendChild(li);

        input.value = '';
        input.focus();
    };

    addBtn.addEventListener('click', addTodo);

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTodo();
        }
    });
});