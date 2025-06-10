const produtos = document.querySelectorAll('.produto');
const telaCompra = document.getElementById('tela-compra');
const compraTitulo = document.getElementById('produto-nome');
const compraDescricao = document.getElementById('produto-descricao');
const compraPreco = document.getElementById('produto-preco');
const compraImg = document.getElementById('produto-img');
const formCompra = document.getElementById('form-compra');
const voltarBtn = document.getElementById('voltar');

let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
let produtoAtual = {};

criarCarrinhoUI();
atualizarCarrinho();

produtos.forEach(produto => {
  const botao = produto.querySelector('button');
  botao.addEventListener('click', () => {
    const titulo = produto.dataset.titulo;
    const descricao = produto.dataset.descricao;
    const preco = produto.dataset.preco;
    const img = produto.dataset.img;

    produtoAtual = { titulo, descricao, preco, img };

    compraTitulo.textContent = titulo;
    compraDescricao.textContent = descricao;
    compraPreco.textContent = preco;
    compraImg.src = img;
    compraImg.alt = titulo;

    document.querySelector('.produtos').style.display = 'none';
    telaCompra.style.display = 'flex';
  });
});

voltarBtn.addEventListener('click', () => {
  telaCompra.style.display = 'none';
  document.querySelector('.produtos').style.display = 'flex';
});

formCompra.addEventListener('submit', (e) => {
  e.preventDefault();
  carrinho.push({ ...produtoAtual });
  localStorage.setItem('carrinho', JSON.stringify(carrinho));
  telaCompra.style.display = 'none';
  document.querySelector('.produtos').style.display = 'flex';
  atualizarCarrinho();
});

function criarCarrinhoUI() {
  const carrinhoContainer = document.createElement('div');
  carrinhoContainer.id = 'carrinho';
  Object.assign(carrinhoContainer.style, {
    position: 'fixed',
    bottom: '10px',
    left: '20px',
    width: '300px',
    maxHeight: '400px',
    overflowY: 'auto',
    background: '#fff',
    border: '1px solid #ccc',
    padding: '10px',
    boxShadow: '0 0 10px rgba(0,0,0,0.2)',
    borderRadius: '8px',
    display: 'none',
    zIndex: '9999'
  });

  const toggleBtn = document.createElement('button');
  toggleBtn.textContent = '🛒';
  Object.assign(toggleBtn.style, {
    position: 'fixed',
    top: '100px',
    right: '3px',
    fontSize: '30px',
    padding: '5px',
    borderRadius: '8px',
    background: '#00b978',
    color: 'white',
    border: 'none',
    cursor: 'pointer'
  });

  toggleBtn.addEventListener('click', () => {
    carrinhoContainer.style.display = carrinhoContainer.style.display === 'none' ? 'block' : 'none';
  });

  document.body.appendChild(toggleBtn);
  document.body.appendChild(carrinhoContainer);
}

function atualizarCarrinho() {
  const carrinhoDiv = document.getElementById('carrinho');
  if (!carrinhoDiv) return;

  if (carrinho.length === 0) {
    carrinhoDiv.innerHTML = '<p>O carrinho está vazio.</p>';
    localStorage.setItem('valorProdutos', '0.00');
    localStorage.removeItem('valorFrete');
    localStorage.removeItem('totalFinal');
    return;
  }

  let total = 0;
  carrinhoDiv.innerHTML = '<h3>🛒 Carrinho</h3><ul style="list-style:none;padding:0;">';

  carrinho.forEach((item, index) => {
    const precoNum = parseFloat(item.preco.replace('R$', '').replace(',', '.'));
    total += precoNum;

    carrinhoDiv.innerHTML += `
      <li style="margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
        <strong>${item.titulo}</strong><br/>
        ${item.preco}
        <button onclick="removerDoCarrinho(${index})" style="margin-left:10px; color:red; background:none; border:none; cursor:pointer;">✖</button>
      </li>
    `;
  });

  carrinhoDiv.innerHTML += `
    </ul>
    <strong>Total: R$ ${total.toFixed(2).replace('.', ',')}</strong><br/><br/>
    <button id="btn-esvaziar" style="width: 100%; padding: 10px; background: #ff5555; color: white; border: none; border-radius: 6px; cursor: pointer; margin-bottom: 10px;">
      Esvaziar Carrinho
    </button>
    <button id="btn-finalizar" style="width: 100%; padding: 10px; background: #00b978; color: white; border: none; border-radius: 6px; cursor: pointer;">
      Finalizar Compra
    </button>
  `;

  localStorage.setItem('carrinho', JSON.stringify(carrinho));
  localStorage.setItem('valorProdutos', total.toFixed(2));
  localStorage.removeItem('valorFrete');
  localStorage.removeItem('totalFinal');

  document.getElementById('btn-finalizar').addEventListener('click', finalizarCompra);
  document.getElementById('btn-esvaziar').addEventListener('click', esvaziarCarrinho);
}

function finalizarCompra() {
  if (carrinho.length === 0) return;
  localStorage.setItem('totalCompra', localStorage.getItem('valorProdutos') || '0.00');
  window.location.href = 'watzapp.html';
}

function esvaziarCarrinho() {
  carrinho.length = 0;
  localStorage.setItem('carrinho', JSON.stringify(carrinho));
  atualizarCarrinho();
}

window.removerDoCarrinho = function(index) {
  carrinho.splice(index, 1);
  atualizarCarrinho();
};

// Pesquisa
document.getElementById("form-pesquisa").addEventListener("submit", function (e) {
  e.preventDefault();
  const termo = document.getElementById("barra-pesquisa").value.toLowerCase();
  const produtos = document.querySelectorAll(".produto");

  produtos.forEach(produto => {
    const titulo = produto.getAttribute("data-titulo").toLowerCase();
    produto.style.display = titulo.includes(termo) ? "flex" : "none";
  });
});
