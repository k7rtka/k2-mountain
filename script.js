// --- 1. НАСТРОЙКА СЦЕНЫ, КАМЕРЫ И РЕНДЕРЕРА ---
const scene = new THREE.Scene();

// Добавляем красивый туман, чтобы скрыть края земли в дымке
scene.background = new THREE.Color(0xdbeafe); 
scene.fog = new THREE.FogExp2(0xdbeafe, 0.015); 

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// Настройки теней для максимального рельефа
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('canvas-container').appendChild(renderer.domElement);

// --- 2. РЕАЛИСТИЧНЫЙ СВЕТ ---
// Рассеянный холодный свет (отражение от неба и снега)
const ambientLight = new THREE.AmbientLight(0x93c5fd, 0.6); 
scene.add(ambientLight);

// Направленный свет солнца, отбрасывающий глубокие тени в ущельях
const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
sunLight.position.set(50, 80, 50);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
scene.add(sunLight);

// --- 3. УПРАВЛЕНИЕ КАМЕРОЙ (ДЛЯ СЕНСОРНЫХ ЭКРАНОВ И МЫШКИ) ---
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Плавное скольжение при вращении пальцем
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.05; // Запрещаем камере заглядывать под землю
camera.position.set(0, 35, 75); // Стартовая позиция камеры

// --- 4. ПРОГРАММНАЯ ГЕНЕРАЦИЯ ВЫСОКОПОЛИГОНАЛЬНОЙ ГОРЫ К2 ---
// Сетка 500x500 обеспечивает 500 000 полигонов для идеальной гладкости склонов
const geometry = new THREE.PlaneGeometry(100, 100, 500, 500);
geometry.rotateX(-Math.PI / 2); // Кладем плоскость горизонтально

const position = geometry.attributes.position;
const colors = [];

// Алгоритм генерации рельефа и окрашивания каждой вершины
for (let i = 0; i < position.count; i++) {
  const x = position.getX(i);
  const z = position.getZ(i);
  
  const distanceToCenter = Math.sqrt(x * x + z * z);
  
  // Базовая конусообразная форма горы
  let y = Math.max(0, 35 - distanceToCenter * 0.85);
  
  if (y > 0) {
    // Многослойный математический шум для имитации скалистых хребтов и расщелин
    const noise = Math.sin(x * 0.25) * Math.cos(z * 0.25) * 3.0 + 
                  Math.sin(x * 0.7) * Math.sin(z * 0.7) * 1.2 +   
                  Math.sin(x * 1.5) * Math.cos(z * 1.5) * 0.4;   
    y += noise;
    
    // Делаем пик горы более острым и прорисованным
    if (distanceToCenter < 12) {
      y += (12 - distanceToCenter) * 0.6;
    }
  } else {
    // Небольшие неровности почвы у подножия горы
    y = Math.sin(x * 0.12) * Math.cos(z * 0.12) * 0.6;
  }
  
  position.setY(i, y);

  // Окрашивание в зависимости от высоты вершины
  const color = new THREE.Color();
  if (y > 19) {
    // Снежная шапка на вершине (белый цвет)
    color.setRGB(0.98, 0.98, 1.0); 
  } else if (y > 7) {
    // Зона таяния снега (плавный переход от темно-серого к белому)
    const ratio = (y - 7) / 12;
    color.lerpColors(new THREE.Color(0x2d2d30), new THREE.Color(0xe2e8f0), ratio);
  } else {
    // Голые скалы у основания (темный базальтовый цвет)
    color.setRGB(0.18, 0.18, 0.2); 
  }
  colors.push(color.r, color.g, color.b);
}

geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
geometry.computeVertexNormals(); // Считаем реалистичные тени на сгибах сетки

// Гладкий материал горы без эффекта Low-Poly
const material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.8, 
  metalness: 0.02,
  flatShading: false 
});

const k2Mountain = new THREE.Mesh(geometry, material);
k2Mountain.castShadow = true;
k2Mountain.receiveShadow = true;
scene.add(k2Mountain);

// --- 5. ДАННЫЕ И ТРЁХМЕРНЫЕ КООРДИНАТЫ ДЛЯ ТОЧЕК ---
const pointsData = {
  camp: {
    title: "Базовый лагерь К2 (5,150 м)",
    text: "Здесь альпинисты неделями живут в палатках на леднике Балторо, проходя акклиматизацию и ожидая хорошей погоды.",
    coords: new THREE.Vector3(-15, 4, 18)
  },
  bottleneck: {
    title: "Бутылочное горлышко (8,200 м)",
    text: "Самый опасный участок маршрута. Узкий кулуар с уклоном до 60°, над которым нависает стена нестабильного ледника.",
    coords: new THREE.Vector3(1, 28, 2)
  },
  summit: {
    title: "Вершина К2 (8,611 м)",
    text: "Вторая по высоте вершина Земли. Из-за высочайшей технической сложности её называют «Дикой горой».",
    coords: new THREE.Vector3(0, 39, 0)
  }
};

const markers = [
  { element: document.getElementById('marker-camp'), data: pointsData.camp },
  { element: document.getElementById('marker-bottleneck'), data: pointsData.bottleneck },
  { element: document.getElementById('marker-summit'), data: pointsData.summit }
];

// --- 6. ОБРАБОТКА КЛИКОВ ПО ТОЧКАМ ---
const infoCard = document.getElementById('info-card');
const cardTitle = document.getElementById('card-title');
const cardText = document.getElementById('card-text');
const closeBtn = document.getElementById('close-card');

markers.forEach(marker => {
  marker.element.addEventListener('click', () => {
    // Заполняем карточку текстом
    cardTitle.innerText = marker.data.title;
    cardText.innerText = marker.data.text;
    infoCard.classList.add('active'); // Показываем карточку
    
    // Плавный подлёт камеры к выбранной точке при помощи GSAP
    gsap.to(camera.position, {
      x: marker.data.coords.x + 20,
      y: marker.data.coords.y + 10,
      z: marker.data.coords.z + 25,
      duration: 1.5,
      ease: "power2.out"
    });
    
    // Поворачиваем камеру лицом к этой точке
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

// Закрытие информационной карточки
closeBtn.addEventListener('click', () => {
  infoCard.classList.remove('active');
});

// --- 7. ПРОЕКЦИЯ КООРДИНАТ ИЗ 3D НА ЭКРАН ТЕЛЕФОНА ---
function updateMarkers() {
  const tempV = new THREE.Vector3();
  
  markers.forEach(marker => {
    tempV.copy(marker.data.coords);
    tempV.project(camera); // Переводим 3D в координаты экрана от -1 до 1
    
    // Переводим координаты в реальные пиксели экрана телефона
    const x = (tempV.x * .5 + .5) * window.innerWidth;
    const y = (tempV.y * -.5 + .5) * window.innerHeight;
    
    // Сдвигаем HTML элемент точки
    marker.element.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;
    
    // Скрываем маркер, если он оказался на обратной стороне горы относительно камеры
    if (tempV.z > 1) {
      marker.element.style.display = 'none';
    } else {
      marker.element.style.display = 'block';
    }
  });
}

// --- 8. АНИМАЦИОННЫЙ ЦИКЛ ОБНОВЛЕНИЯ КАДРОВ ---
function animate() {
  requestAnimationFrame(animate);
  
  controls.update(); // Обновляем физику вращения камеры
  updateMarkers();   // Пересчитываем положение точек на экране
  
  renderer.render(scene, camera);
}
animate();

// Подстраиваем пропорции 3D-сцены под поворот экрана мобильного
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
