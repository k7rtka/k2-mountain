// --- 1. Настройка сцены ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f172a); // Цвет фона должен совпадать с CSS

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio); // Улучшает четкость на экранах телефонов
renderer.shadowMap.enabled = true;
document.getElementById('canvas-container').appendChild(renderer.domElement);

// --- 2. Настройка реалистичного освещения ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Мягкий общий свет
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.2); // Яркий свет солнца
sunLight.position.set(500, 500, 200);
sunLight.castShadow = true;
scene.add(sunLight);

// --- 3. Управление камерой (вращение, зум) ---
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Плавное скольжение камеры
camera.position.set(0, 500, 1000); // Стартовая позиция

// --- 4. Загрузка 3D-модели Эвереста ---
const loader = new THREE.GLTFLoader();
loader.load('everest.glb', (gltf) => {
    const model = gltf.scene;
    
    // Этот блок автоматически центрирует любую скачанную модель точно по центру экрана
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center); 
    
    scene.add(model);
}, undefined, (error) => {
    console.error('Ошибка загрузки модели Эвереста:', error);
});

// --- 5. Анимационный цикл ---
function animate() {
    requestAnimationFrame(animate);
    controls.update(); // Обязательно для плавной работы OrbitControls
    renderer.render(scene, camera);
}
animate();

// --- 6. Адаптивность при повороте экрана ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
