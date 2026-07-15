// --- 1. НАСТРОЙКА СЦЕНЫ, КАМЕРЫ И РЕНДЕРЕРА ---
const scene = new THREE.Scene();

// Добавляем красивый туман, чтобы скрыть границы 3D-мира
scene.background = new THREE.Color(0xdbeafe); // Нежно-голубой цвет неба
scene.fog = new THREE.FogExp2(0xdbeafe, 0.015); 

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// Включаем мягкие тени для реалистичного рельефа горы
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Добавляем окно рендера в наш HTML-контейнер
document.getElementById('canvas-container').appendChild(renderer.domElement);

// --- 2. РЕАЛИСТИЧНЫЙ СВЕТ ---
// Мягкий синеватый свет снизу/сбоку (имитирует отражение от снега)
const ambientLight = new THREE.AmbientLight(0x93c5fd, 0.7); 
scene.add(ambientLight);

// Яркий направленный свет (солнце) для глубоких теней в ущельях
const sunLight = new THREE.DirectionalLight(0xffffff, 1.4);
sunLight.position.set(100, 80, 50);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
scene.add(sunLight);

// --- 3. УПРАВЛЕНИЕ КАМЕРОЙ (КРУТИМ ГОРУ ПАЛЬЦЕМ/МЫШКОЙ) ---
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Плавное скольжение при вращении
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.05; // Запрещаем камере заглядывать под текстуру земли
camera.position.set(0, 30, 70); // Стартовая позиция камеры

// --- 4. ДАННЫЕ ДЛЯ НАШИХ ТОЧЕК НА ГОРЕ ---
// Координаты Vector3(X, Y, Z) нужно будет немного подвинуть под твою 3D-модель!
const pointsData = {
  camp: {
    title: "Базовый лагерь К2 (5,150 м)",
    text: "Здесь альпинисты неделями ждут идеальной погоды, готовясь к тяжелейшему штурму вершины.",
    coords: new THREE.Vector3(-8, 2, 8)
  },
  bottleneck: {
    title: "Бутылочное горлышко (8,200 м)",
    text: "Самый смертоносный участок. Узкий желоб под нависающими глыбами льда, готовыми рухнуть в любую секунду.",
    coords: new THREE.Vector3(0, 18, 2)
  },
  summit: {
    title: "Вершина К2 (8,611 м)",
    text: "Вторая по высоте вершина мира. Считается технически гораздо более сложной и опасной для восхождения, чем Эверест.",
    coords: new THREE.Vector3(0, 25, 0)
  }
};

// Связываем HTML-маркеры с нашими данными
const markers = [
  { element: document.getElementById('marker-camp'), data: pointsData.camp },
  { element: document.getElementById('marker-bottleneck'), data: pointsData.bottleneck },
  { element: document.getElementById('marker-summit'), data: pointsData.summit }
];

// --- 5. КЛИКИ ПО ТОЧКАМ И ОТКРЫТИЕ КАРТОЧКИ ---
const infoCard = document.getElementById('info-card');
const cardTitle = document.getElementById('card-title');
const cardText = document.getElementById('card-text');
const closeBtn = document.getElementById('close-card');

markers.forEach(marker => {
  marker.element.addEventListener('click', () => {
    // Заполняем карточку текстом
    cardTitle.innerText = marker.data.title;
    cardText.innerText = marker.data.text;
    infoCard.classList.add('active'); // Показываем её
    
    // Плавный «подлёт» камеры к выбранной точке с помощью библиотеки GSAP
    gsap.to(camera.position, {
      x: marker.data.coords.x + 15,
      y: marker.data.coords.y + 5,
      z: marker.data.coords.z + 20,
      duration: 1.5,
      ease: "power2.out"
    });
    // Поворачиваем фокус камеры точно на выбранную точку
    gsap.to(controls.target, {
      x: marker.data.coords.x,
      y: marker.data.coords.y,
      z: marker.data.coords.z,
      duration: 1.5,
      ease: "power2.out",
      onUpdate: () => controls.update()
    });
  });
});

// Закрытие карточки при клике на крестик
closeBtn.addEventListener('click', () => {
  infoCard.classList.remove('active');
});

// --- 6. ЗАГРУЗКА 3D-МОДЕЛИ ГОРА К2 ---
const loader = new THREE.GLTFLoader();
loader.load(
  'k2_precise.glb', // Файл должен лежать в той же папке на GitHub
  (gltf) => {
    const k2 = gltf.scene;
    
    k2.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        // Настройка матовости, чтобы скалы и снег не блестели как пластик
        if (child.material) {
          child.material.roughness = 0.85;
          child.material.metalness = 0.05;
        }
      }
    });
    
    scene.add(k2);
  },
  undefined,
  (error) => {
    console.error('Ошибка загрузки 3D-модели:', error);
  }
);

// --- 7. ПРОЕКЦИЯ 3D-КООРДИНАТ НА ЭКРАН ТЕЛЕФОНА ---
function updateMarkers() {
  const tempV = new THREE.Vector3();
  
  markers.forEach(marker => {
    tempV.copy(marker.data.coords);
    
    // Проецируем 3D координаты точки в 2D-координаты экрана (-1 до +1)
    tempV.project(camera);
    
    // Переводим это в пиксели в зависимости от размера экрана устройства
    const x = (tempV.x * .5 + .5) * window.innerWidth;
    const y = (tempV.y * -.5 + .5) * window.innerHeight;
    
    // Сдвигаем HTML-маркер на эти пиксели
    marker.element.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;
    
    // Если точка оказалась «за спиной» у камеры (когда мы покрутили гору обратной стороной) - скрываем её
    if (tempV.z > 1) {
      marker.element.style.display = 'none';
    } else {
      marker.element.style.display = 'block';
    }
  });
}

// --- 8. ПОСТОЯННЫЙ ЦИКЛ ОБНОВЛЕНИЯ (АНИМАЦИЯ) ---
function animate() {
  requestAnimationFrame(animate);
  
  controls.update(); // Обновляем положение камеры
  updateMarkers();   // Пересчитываем положение точек на экране
  
  renderer.render(scene, camera);
}
animate();

// Корректно растягиваем 3D-сцену, если перевернули телефон горизонтально
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
