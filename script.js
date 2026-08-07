// Расширенная карта с сюжетным вопросом
const map = {
  d_cell: {
    name: "Камера D-Class (Спавн)",
    desc: "Вы приходите в себя на холодной кушетке. Голова раскалывается, а в глазах всё плывет. Металлическая дверь камеры полуоткрыта.",
    exits: { "Выйти в коридор": "d_hallway" }
  },
  d_hallway: {
    name: "Коридор блока D",
    desc: "Мигающие лампы издают мерзкий гул. На стенах видны следы отчаянных попыток выбраться.",
    exits: {
      "Вернуться в камеру": "d_cell",
      "В столовую": "d_cafeteria",
      "В душевую": "d_showers",
      "К шлюзу ЛЗС": "lz_airlock"
    }
  },
  d_cafeteria: {
    name: "Столовая D-Class",
    desc: "Перевернутая мебель и разбросанные подносы. На стене выведена надпись: «ОНО НЕ СПИТ».",
    exits: { "Назад в коридор": "d_hallway" }
  },
  d_showers: {
    name: "Душевая блока D",
    desc: "Густой туман и капающая вода. В углу лежит разбитый радиоприемник, издающий шипение.",
    exits: { "Назад в коридор": "d_hallway" }
  },
  lz_airlock: {
    name: "Шлюз Легкой Зоны Сдерживания",
    desc: "Гермодверь заблокирована, но рядом горит терминал управления.",
    exits: {
      "Назад в блок D": "d_hallway",
      "В пункт наблюдения": "security_room"
    }
  },
  security_room: {
    name: "Пункт наблюдения",
    desc: "На экранах мониторов — сплошной белый шум. Неожиданно динамик на стене издает треск, и чей-то искаженный голос произносит:\n\n«Ты помнишь свое настоящее имя... или только номер, который тебе дали?»",
    exits: {
      "«Я помню, кто я»": "RESET_EVENT",
      "«Я всего лишь D-4126»": "RESET_EVENT",
      "Молча сделать шаг назад": "RESET_EVENT"
    }
  }
};

// Состояние игры
let currentRoomKey = "d_cell";
let loopCount = 1;

// DOM Элементы
const locEl = document.getElementById("current-location");
const descEl = document.getElementById("description");
const btnsContainer = document.getElementById("buttons-container");
const loopEl = document.getElementById("loop-count");
const screenEl = document.getElementById("screen");

// Перезапуск цикла (Пробуждение)
function wakeUp() {
  currentRoomKey = "d_cell";
  loopCount++;
  
  // Добавляем класс анимации VHS-пробуждения
  screenEl.classList.remove("wake-up");
  void screenEl.offsetWidth; // Перезапуск анимации CSS
  screenEl.classList.add("wake-up");

  render();
}

// Отрисовка состояния
function render() {
  const room = map[currentRoomKey];
  
  locEl.textContent = room.name;
  descEl.textContent = room.desc;
  loopEl.textContent = `#${loopCount}`;
  
  btnsContainer.innerHTML = "";
  
  for (const [btnText, targetRoomKey] of Object.entries(room.exits)) {
    const btn = document.createElement("button");
    btn.textContent = btnText;
    
    btn.onclick = () => {
      if (targetRoomKey === "RESET_EVENT") {
        wakeUp(); // Срабатывает пробуждение
      } else {
        currentRoomKey = targetRoomKey;
        render();
      }
    };
    btnsContainer.appendChild(btn);
  }
}

// Первый запуск
screenEl.classList.add("wake-up");
render();
