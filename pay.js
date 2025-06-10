const CEP_ORIGEM_FIXO = "09260840";
const PESO_FIXO = 1.5;

let valorProdutos = 0;
let valorFrete = 0;
let txidGerado = '';

function tlv(id, value) {
  const length = value.length.toString().padStart(2, '0');
  return id + length + value;
}

function crc16(payload) {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function gerarPayloadPix({ pixKey, merchantName, merchantCity, amount, txid = '*' }) {
  const payload = [
    tlv('00', '01'),
    tlv('26', tlv('00', 'br.gov.bcb.pix') + tlv('01', pixKey)),
    tlv('52', '0000'),
    tlv('53', '986'),
    tlv('54', amount),
    tlv('58', 'BR'),
    tlv('59', merchantName.slice(0, 25)),
    tlv('60', merchantCity.slice(0, 15)),
    tlv('62', tlv('05', txid))
  ].join('');

  const crc = crc16(payload + '6304');
  return payload + '6304' + crc;
}

async function buscarEnderecoECoordenadas(cep) {
  const viaCepResp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  const viaCepData = await viaCepResp.json();
  if (viaCepData.erro) throw new Error("CEP inválido");

  const endereco = `${viaCepData.localidade}, ${viaCepData.uf}, Brasil`;
  const geoResp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}`, {
    headers: { 'User-Agent': 'frete-simulador/1.0' }
  });
  const geoData = await geoResp.json();
  if (!geoData.length) throw new Error("Não foi possível obter coordenadas");

  return {
    cidade: viaCepData.localidade,
    uf: viaCepData.uf,
    lat: parseFloat(geoData[0].lat),
    lon: parseFloat(geoData[0].lon)
  };
}

function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcularFrete(distanciaKm, pesoKg) {
  return 10 + (0.75 * distanciaKm) + (3 * pesoKg);
}

window.addEventListener('load', () => {
  const valorProd = parseFloat(localStorage.getItem('valorProdutos'));
  const valorFreteSalvo = parseFloat(localStorage.getItem('valorFrete'));

  valorProdutos = isNaN(valorProd) ? 0.00 : valorProd;
  valorFrete = isNaN(valorFreteSalvo) ? 0.00 : valorFreteSalvo;

  const totalFinal = valorProdutos + valorFrete;
  document.getElementById('valor-total').textContent = totalFinal.toFixed(2).replace('.', ',');
});

const freteForm = document.getElementById('freteForm');
const calcularBtn = freteForm.querySelector('button');

freteForm.addEventListener('submit', async function (e) {
  e.preventDefault();

  const cepDestino = document.getElementById('cepDestino').value.trim();
  const resultadoDiv = document.getElementById('resultado');
  const qrcodeDiv = document.getElementById('qrcode');
  const btnEnviar = document.getElementById('btnEnviarDados');

  resultadoDiv.innerHTML = 'Calculando...';

  // Previne múltiplos cliques
  calcularBtn.disabled = true;
  calcularBtn.textContent = 'Calculando...';

  // Limpa QR Code com segurança
  while (qrcodeDiv.firstChild) {
    qrcodeDiv.removeChild(qrcodeDiv.firstChild);
  }

  btnEnviar.style.display = 'none';

  try {
    const origem = await buscarEnderecoECoordenadas(CEP_ORIGEM_FIXO);
    const destino = await buscarEnderecoECoordenadas(cepDestino);
    const distancia = calcularDistanciaKm(origem.lat, origem.lon, destino.lat, destino.lon);
    const frete = calcularFrete(distancia, PESO_FIXO);

    localStorage.setItem('valorFrete', frete.toFixed(2));

    valorProdutos = parseFloat(localStorage.getItem('valorProdutos') || '0.00');
    valorFrete = frete;

    const totalFinal = valorProdutos + valorFrete;
    localStorage.setItem('totalFinal', totalFinal.toFixed(2));

    document.getElementById('valor-total').textContent = totalFinal.toFixed(2).replace('.', ',');

    txidGerado = 'TOPERPAG' + Math.floor(Math.random() * 1000000);

    resultadoDiv.innerHTML = `
      <p><strong>Destino:</strong> ${destino.cidade}/${destino.uf}</p>
      <p><strong>Distância Aproximada:</strong> ${distancia.toFixed(2)} km</p>
      <p><strong>Total dos produtos:</strong> R$ ${valorProdutos.toFixed(2).replace('.', ',')}</p>
      <p><strong>Frete:</strong> R$ ${valorFrete.toFixed(2).replace('.', ',')}</p>
      <p><strong>Total com frete:</strong> R$ ${totalFinal.toFixed(2).replace('.', ',')}</p>
      <p><strong>Escaneie o QR Code abaixo para pagar via Pix:</strong></p>
    `;

    const payloadPix = gerarPayloadPix({
      pixKey: '50831262818',
      merchantName: 'Victor Granai Miguel',
      merchantCity: 'Sao Paulo',
      amount: totalFinal.toFixed(2),
      txid: txidGerado
    });

    new QRCode(qrcodeDiv, {
      text: payloadPix,
      width: 250,
      height: 250
    });

    btnEnviar.style.display = 'inline-block';

  } catch (err) {
    resultadoDiv.innerHTML = `<span style="color:red; font-weight:bold;">Erro: ${err.message}</span>`;
  } finally {
    calcularBtn.disabled = false;
    calcularBtn.textContent = 'Calcular Frete e Gerar PIX';
  }
});

document.getElementById('btnEnviarDados').addEventListener('click', async function () {
  const nome = document.getElementById('Ncompleto').value.trim();
  const telefone = document.getElementById('tel').value.trim();
  const cpf = document.getElementById('cpfUser').value.trim();
  const cep = document.getElementById('cepDestino').value.trim();
  const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];

  const dados = {
    nome,
    telefone,
    cpf,
    cep,
    valorProdutos: valorProdutos.toFixed(2),
    valorFrete: valorFrete.toFixed(2),
    totalFinal: (valorProdutos + valorFrete).toFixed(2),
    txid: txidGerado,
    produtos: carrinho.map((item, index) => ({
      item: index + 1,
      titulo: item.titulo,
      preco: item.preco
    }))
  };

  try {
    const response = await fetch("https://formspree.io/f/mldnjlja", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(dados)
    });

    if (response.ok) {
      alert("Dados enviados com sucesso!");
    } else {
      alert("Erro ao enviar dados. Verifique e tente novamente.");
    }
  } catch (error) {
    console.error("Erro:", error);
    alert("Erro de rede ao enviar os dados.");
  }
});
