// Nome do bucket no Google Cloud Storage onde as imagens estão armazenadas
const BUCKET = 'arquivos-clientes-sntn';

// Variáveis de estado utilizadas para controlar a galeria
let allImages = {};             // Armazena as imagens separadas por pasta
let currentTab = 'Geral';       // Aba atualmente ativa
let imageList = [];             // Lista de URLs exibidas na galeria
let currentIndex = 0;           // Índice da imagem mostrada no lightbox
let loadedCount = 0;            // Número de imagens já carregadas
const initialBatch = 20;        // Quantidade inicial de imagens carregadas
const batchSize = 10;           // Quantidade adicional a cada carregamento
let observer;                   // IntersectionObserver para rolagem infinita

/**
 * Embaralha um array usando o algoritmo de Fisher-Yates.
 * @param {Array} arr - Lista de elementos a ser embaralhada.
 * @returns {Array} Lista embaralhada.
 */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Busca os nomes das imagens no servidor e organiza-as em pastas.
 */
async function fetchImages() {
  // Requisição ao backend que retorna a lista de arquivos do bucket
  const res = await fetch('get-images.php');
  // Converte a resposta para JSON
  const data = await res.json();

  // Caso não haja arquivos, encerra a função
  if (!data.items) return;

  // Para cada arquivo retornado...
  data.items.forEach(file => {
    // Ignora itens que não sejam imagens
    if (!/\.(jpe?g|png|webp)$/i.test(file.name)) return;
    // Determina o nome da pasta baseado no caminho do arquivo
    const parts = file.name.split('/');
    const folder = parts[1] || 'Geral';
    // Monta a URL pública da imagem
    const url = `https://storage.googleapis.com/${BUCKET}/${encodeURIComponent(file.name)}`;
    // Adiciona a imagem à pasta correspondente
    if (!allImages[folder]) allImages[folder] = [];
    allImages[folder].push(url);
    // Mantém também uma lista com todas as imagens
    if (!allImages['Geral']) allImages['Geral'] = [];
    allImages['Geral'].push(url);
  });

  // Cria as abas e carrega a galeria inicial
  createTabs();
  loadGallery('Geral');
}

/**
 * Cria os botões de abas com base nas pastas encontradas.
 */
function createTabs() {
  const tabs = document.getElementById('tabs');
  tabs.innerHTML = '';
  Object.keys(allImages).forEach(tab => {
    const button = document.createElement('button');
    button.className = 'tab';
    button.textContent = tab;
    // Ao clicar em uma aba, carregamos a galeria correspondente
    button.onclick = () => loadGallery(tab);
    if (tab === 'Geral') button.classList.add('active');
    tabs.appendChild(button);
  });
}

/**
 * Carrega as imagens da aba selecionada na galeria.
 * @param {string} tab - Nome da pasta a ser exibida.
 */
function loadGallery(tab) {
  currentTab = tab;
  // Clona a lista de imagens para evitar mutações na original
  imageList = allImages[tab].slice();
  // Embaralha as imagens apenas na aba geral
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

  // Remove qualquer observador anterior
  if (observer) observer.disconnect();

  if (tab === 'Geral') {
    appendNextBatch();

    const sentinel = document.createElement('div');
    sentinel.id = 'sentinel';
    sentinel.style.height = '1px';
    gallery.appendChild(sentinel);

    // Observa o sentinel para carregar mais imagens ao chegar ao final
    observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        appendNextBatch();
      }
    });

    observer.observe(sentinel);
  } else {
    // Nas pastas específicas, carrega todas as imagens de uma vez
    imageList.forEach((url, index) => {
      const img = document.createElement('img');
      img.src = url;
      img.loading = 'lazy';
      img.onclick = () => openLightbox(index);
      gallery.appendChild(img);
    });
  }
}

/**
 * Adiciona o próximo conjunto de imagens na galeria.
 */
function appendNextBatch() {
  const gallery = document.getElementById('gallery');
  // Define o próximo lote: maior no carregamento inicial
  const nextBatch = imageList.slice(loadedCount, loadedCount + (loadedCount === 0 ? initialBatch : batchSize));

  nextBatch.forEach((url, i) => {
    const realIndex = loadedCount + i;
    const img = document.createElement('img');
    img.src = url;
    img.loading = 'lazy';
    img.onclick = () => openLightbox(realIndex);
    // Insere antes do sentinel utilizado pelo IntersectionObserver
    gallery.insertBefore(img, document.getElementById('sentinel'));
  });

  loadedCount += nextBatch.length;
}

/**
 * Abre o lightbox e exibe a imagem correspondente ao índice informado.
 */
function openLightbox(index) {
  currentIndex = index;
  document.getElementById('lightbox-img').src = imageList[index];
  document.getElementById('lightbox').style.display = 'flex';
}

/** Fecha o lightbox. */
function closeLightbox() {
  document.getElementById('lightbox').style.display = 'none';
}

/** Avança para a próxima imagem no lightbox. */
function nextImage() {
  if (currentIndex < imageList.length - 1) openLightbox(currentIndex + 1);
}

/** Volta para a imagem anterior no lightbox. */
function prevImage() {
  if (currentIndex > 0) openLightbox(currentIndex - 1);
}

// Fecha o lightbox ao clicar fora da imagem
document.getElementById('lightbox').addEventListener('click', closeLightbox);

// Permite navegação por teclado dentro do lightbox
document.addEventListener('keydown', e => {
  if (document.getElementById('lightbox').style.display === 'flex') {
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'ArrowLeft') prevImage();
    if (e.key === 'Escape') closeLightbox();
  }
});

// Suporte a gestos de deslizar no touch
document.getElementById('lightbox').addEventListener('touchstart', handleTouchStart, false);
document.getElementById('lightbox').addEventListener('touchmove', handleTouchMove, false);

let xDown = null; // Posição horizontal inicial do toque

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

// Elementos do menu simples
const simpleBtn = document.getElementById('simpleMenuBtn');
const simpleMenu = document.getElementById('simpleMenu');

// Alterna a visibilidade do menu ao clicar no botão
simpleBtn.addEventListener('click', () => {
  simpleMenu.classList.toggle('show');
});

// Fecha o menu ao clicar fora dele
document.addEventListener('click', e => {
  if (!simpleBtn.contains(e.target) && !simpleMenu.contains(e.target)) {
    simpleMenu.classList.remove('show');
  }
});

// Inicia a aplicação buscando as imagens do servidor
fetchImages();
