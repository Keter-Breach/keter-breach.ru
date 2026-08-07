// Расширенная карта комплекса
const map = {
  d_cell: {
    name: "Камера D-Class (Спавн)",
    desc: "Вы находитесь в тесной и сырой камере содержания D-класса. Стальная дверь приоткрыта.",
    exits: { "В коридор": "d_hallway" }
  },
  d_hallway: {
    name: "Коридор блока D",
    desc: "Длинный коридор с тусклым мигающим светом. Отсюда можно пройти в другие части блока.",
    exits: {
      "В камеру D-Class": "d_cell",
      "В столовую": "d_cafeteria",
      "В душевую": "d_showers",
      "К шлюзу ЛЗС": "lz_airlock"
    }
  },
  d_cafeteria: {
    name: "Столовая D-Class",
    desc: "Заброшенное помещение. Перевернутые столы и разбросанные подносы.",
    exits: { "Назад в коридор": "d_hallway" }
  },
  d_showers: {
    name: "Душевая блока D",
    desc: "Кафель покрыт плесенью. Слышно капанье воды из ржавой трубы.",
    exits: { "Назад в коридор": "d_hallway" }
  },
  lz_airlock: {
    name: "Шлюз Легкой Зоны Сдерживания (ЛЗС)",
    desc: "Массивная гермодверь отделяет блок D от исследовательских лабораторий.",
    exits: {
      "Назад в блок D": "d_hallway",
      "Войти в ЛЗС": "lz_main"
    }
  },
  lz_main: {
    name: "Главный холл ЛЗС",
    desc: "Просторный коридор с указателями к камерам содержания и офисам.",
    exits: {
      "К шлюзу блока D": "lz_airlock",
      "Камера SCP-173": "scp_173",
      "Исследовательский сектор": "labs",
      "Переход в ТЗС": "hz_entrance"
    }
  },
  scp_173: {
    name: "Камера содержания SCP-173",
    desc: "Стеклянная смотровая площадка перед гермозатвором. Внутри видна бетонная статуя.",
    exits: { "В холл ЛЗС": "lz_main" }
  },
  labs: {
    name: "Лаборатории",
    desc: "Кабинеты ученых. На столах стоят включенные мониторы с ошибками доступа.",
    exits: { "В холл ЛЗС": "lz_main" }
  },
  hz_entrance: {
    name: "Вход в Тяжелую Зону Сдерживания (ТЗС)",
    desc: "Темный сектор с усиленной броней на стенах и тревожной сигнализацией.",
    exits: { "Вернуться в ЛЗС": "lz_main" }
  }
};

// Состояние игрока
let currentRoomKey = "d_cell"; // Точка спавна

// Элементы DOM
const locEl = document.getElementById("current-location");
const descEl = document.getElementById("description");
const btnsContainer = document.getElementById("buttons-container");

// Функция обновления экрана
function render() {
  const room = map[currentRoomKey];
  
  locEl.textContent = room.name;
  descEl.textContent = room.desc;
  
  btnsContainer.innerHTML = "";
  
  for (const [btnText, targetRoomKey] of Object.entries(room.exits)) {
    const btn = document.createElement("button");
    btn.textContent = btnText;
    btn.onclick = () => {
      currentRoomKey = targetRoomKey;
      render();
    };
    btnsContainer.appendChild(btn);
  }
}

// Запуск игры при загрузке
render();
