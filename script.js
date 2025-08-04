const BUCKET = 'arquivos-clientes-sntn';

let allImages = {};
let currentTab = 'Geral';
let imageList = [];
let currentIndex = 0;
let loadedCount = 0;
const initialBatch = 20;
const batchSize = 10;
let observer;

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}





async function fetchImages() {
const res = await fetch('get-images.php');
const data = await res.json();





  if (!data.items) return;

  data.items.forEach(file => {
    if (!/\.(jpe?g|png|webp)$/i.test(file.name)) return;
    const parts = file.name.split('/');
    const folder = parts[1] || 'Geral';
    const url = `https://storage.googleapis.com/${BUCKET}/${encodeURIComponent(file.name)}`;
    if (!allImages[folder]) allImages[folder] = [];
    allImages[folder].push(url);
    if (!allImages['Geral']) allImages['Geral'] = [];
    allImages['Geral'].push(url);
  });

  createTabs();
  loadGallery('Geral');
}

function createTabs() {
  const tabs = document.getElementById('tabs');
  tabs.innerHTML = '';
  Object.keys(allImages).forEach(tab => {
    const button = document.createElement('button');
    button.className = 'tab';
    button.textContent = tab;
    button.onclick = () => loadGallery(tab);
    if (tab === 'Geral') button.classList.add('active');
    tabs.appendChild(button);
  });
}

function loadGallery(tab) {
  currentTab = tab;
  imageList = allImages[tab].slice();
  if (tab === 'Geral') {
    imageList = shuffleArray(imageList);
  }

  currentIndex = 0;
  loadedCount = 0;
  const gallery = document.getElementById('gallery');
  const buttons = document.querySelectorAll('.tab');
  buttons.forEach(btn => btn.classList.remove('active'));
  document.querySelector(`.tab:nth-child(${Object.keys(allImages).indexOf(tab) + 1})`).classList.add('active');
  gallery.innerHTML = '';

  if (observer) observer.disconnect();

  if (tab === 'Geral') {
    appendNextBatch();

    const sentinel = document.createElement('div');
    sentinel.id = 'sentinel';
    sentinel.style.height = '1px';
    gallery.appendChild(sentinel);

    observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        appendNextBatch();
      }
    });

    observer.observe(sentinel);
  } else {
    imageList.forEach((url, index) => {
      const img = document.createElement('img');
      img.src = url;
      img.loading = 'lazy';
      img.onclick = () => openLightbox(index);
      gallery.appendChild(img);
    });
  }
}

function appendNextBatch() {
  const gallery = document.getElementById('gallery');
  const nextBatch = imageList.slice(loadedCount, loadedCount + (loadedCount === 0 ? initialBatch : batchSize));

  nextBatch.forEach((url, i) => {
    const realIndex = loadedCount + i;
    const img = document.createElement('img');
    img.src = url;
    img.loading = 'lazy';
    img.onclick = () => openLightbox(realIndex);
    gallery.insertBefore(img, document.getElementById('sentinel'));
  });

  loadedCount += nextBatch.length;
}

function openLightbox(index) {
  currentIndex = index;
  document.getElementById('lightbox-img').src = imageList[index];
  document.getElementById('lightbox').style.display = 'flex';
}

function closeLightbox() {
  document.getElementById('lightbox').style.display = 'none';
}

function nextImage() {
  if (currentIndex < imageList.length - 1) openLightbox(currentIndex + 1);
}

function prevImage() {
  if (currentIndex > 0) openLightbox(currentIndex - 1);
}

document.getElementById('lightbox').addEventListener('click', closeLightbox);
document.addEventListener('keydown', e => {
  if (document.getElementById('lightbox').style.display === 'flex') {
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'ArrowLeft') prevImage();
    if (e.key === 'Escape') closeLightbox();
  }
});

document.getElementById('lightbox').addEventListener('touchstart', handleTouchStart, false);
document.getElementById('lightbox').addEventListener('touchmove', handleTouchMove, false);

let xDown = null;

function handleTouchStart(evt) {
  xDown = evt.touches[0].clientX;
}

function handleTouchMove(evt) {
  if (!xDown) return;
  let xUp = evt.touches[0].clientX;
  let xDiff = xDown - xUp;
  if (Math.abs(xDiff) > 50) {
    if (xDiff > 0) nextImage(); else prevImage();
    xDown = null;
  }
}

const simpleBtn = document.getElementById('simpleMenuBtn');
const simpleMenu = document.getElementById('simpleMenu');

simpleBtn.addEventListener('click', () => {
  simpleMenu.classList.toggle('show');
});

document.addEventListener('click', e => {
  if (!simpleBtn.contains(e.target) && !simpleMenu.contains(e.target)) {
    simpleMenu.classList.remove('show');
  }
});

fetchImages();

