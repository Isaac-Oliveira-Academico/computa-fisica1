/* COMPUTA Web V1.1 — interface mobile-first e cálculo assíncrono */

const elementos = {
    botaoCalcular: document.getElementById("calcular"),
    botaoRestaurar: document.getElementById("restaurar-exemplo"),
    botaoGraficos: document.getElementById("botao-graficos"),
    botaoCancelar: document.getElementById("cancelar-calculo"),
    resultado: document.getElementById("resultado"),
    status: document.getElementById("status"),
    estadoMotor: document.getElementById("estado-motor"),
    seletorAcao: document.getElementById("acao"),
    funcao: document.getElementById("funcao"),
    tInicial: document.getElementById("t-inicial"),
    tFinal: document.getElementById("t-final"),
    entradaExtraContainer: document.getElementById("entrada-extra-container"),
    entradaExtraLabel: document.getElementById("entrada-extra-label"),
    entradaExtra: document.getElementById("entrada-extra"),
    entradaExtraAjuda: document.getElementById("entrada-extra-ajuda"),
    intervaloContainer: document.getElementById("intervalo-container"),
    intervaloT1: document.getElementById("intervalo-t1"),
    intervaloT2: document.getElementById("intervalo-t2"),
    comparacaoContainer: document.getElementById("comparacao-container"),
    funcaoB: document.getElementById("funcao-b"),
    tBInicial: document.getElementById("t-b-inicial"),
    tBFinal: document.getElementById("t-b-final"),
    comparacaoTipo: document.getElementById("comparacao-tipo"),
    acoesResultado: document.getElementById("acoes-resultado"),
    graficosContainer: document.getElementById("graficos-container"),
    painelResultado: document.getElementById("painel-resultado"),
    overlay: document.getElementById("processamento-overlay"),
    overlayMensagem: document.getElementById("processamento-mensagem"),
    overlayTempo: document.getElementById("processamento-tempo")
};

const CONFIG = {
    timeoutAvisoMs: 12000,
    timeoutMaximoMs: 30000,
    maxCaracteresExpressao: 160,
    maxOperadores: 45,
    maxProfundidadeParenteses: 12,
    maxExpoenteDireto: 20
};

let worker = null;
let workerPronto = false;
let pedidoAtual = null;
let proximoId = 1;
let timerAviso = null;
let timerTimeout = null;
let timerRelogio = null;
let inicioProcessamento = null;
let ultimoModeloValido = null;
let graficosVisiveis = false;


/* ============================================================
   1. WORKER PYTHON / SYMPY
   ============================================================ */

function criarWorker() {
    if (worker) {
        worker.terminate();
    }

    workerPronto = false;
    elementos.botaoCalcular.disabled = true;
    elementos.botaoCalcular.textContent = "Preparando motor...";
    elementos.estadoMotor.classList.remove("pronto", "erro");
    elementos.estadoMotor.textContent = "Preparando motor Python/SymPy...";
    elementos.status.textContent = "Inicializando motor Python/SymPy...";

    worker = new Worker("worker.js?v=1.1");
    worker.onmessage = tratarMensagemWorker;

    worker.onerror = event => {
        console.error("Erro no worker:", event);
        workerPronto = false;
        elementos.estadoMotor.textContent = "Falha ao carregar o motor.";
        elementos.estadoMotor.classList.add("erro");
        elementos.status.textContent = "Não foi possível iniciar Python/SymPy.";
        elementos.botaoCalcular.disabled = true;
        encerrarProcessamento();
        mostrarErro(
            "O motor Python/SymPy não pôde ser inicializado. " +
            "Verifique a conexão com a internet e recarregue a página."
        );
    };
}

function tratarMensagemWorker(event) {
    const mensagem = event.data;

    if (!mensagem) {
        return;
    }

    if (mensagem.tipo === "status") {
        elementos.estadoMotor.textContent = mensagem.mensagem;
        elementos.status.textContent = mensagem.mensagem;
        return;
    }

    if (mensagem.tipo === "ready") {
        workerPronto = true;
        elementos.estadoMotor.textContent = "Motor pronto";
        elementos.estadoMotor.classList.add("pronto");
        elementos.botaoCalcular.disabled = false;
        elementos.botaoCalcular.textContent = "Calcular";
        elementos.status.textContent = "Motor Python/SymPy pronto.";
        return;
    }

    if (mensagem.tipo === "fatal") {
        workerPronto = false;
        elementos.estadoMotor.textContent = "Falha no motor";
        elementos.estadoMotor.classList.add("erro");
        elementos.botaoCalcular.disabled = true;
        elementos.status.textContent = mensagem.mensagem;
        encerrarProcessamento();
        mostrarErro(mensagem.mensagem);
        return;
    }

    if (!pedidoAtual || mensagem.id !== pedidoAtual.id) {
        return;
    }

    if (mensagem.tipo === "resultado") {
        const pedido = pedidoAtual;
        encerrarProcessamento();

        if (pedido.finalidade === "graficos") {
            renderizarGraficos(mensagem.dados);
            return;
        }

        renderizarResultado(mensagem.dados);
        registrarModeloValido(pedido.payload);
        return;
    }

    if (mensagem.tipo === "erro") {
        const finalidade = pedidoAtual.finalidade;

        encerrarProcessamento();
        console.error(mensagem.detalhe || mensagem.mensagem);

        if (finalidade === "graficos") {
            elementos.graficosContainer.hidden = false;
            elementos.graficosContainer.innerHTML = `
                <div class="mensagem-erro">
                    <strong>Não foi possível gerar os gráficos.</strong>
                    <p>${escaparHtml(mensagem.mensagem)}</p>
                </div>
            `;
            elementos.status.textContent = "O cálculo permanece válido; apenas os gráficos falharam.";
            elementos.botaoGraficos.disabled = false;
            return;
        }

        mostrarErro(mensagem.mensagem);
    }
}


/* ============================================================
   2. PROCESSAMENTO ASSÍNCRONO, TIMEOUT E CANCELAMENTO
   ============================================================ */

function iniciarProcessamento(mensagem, finalidade) {
    inicioProcessamento = Date.now();
    elementos.overlayMensagem.textContent = mensagem;
    elementos.overlayTempo.textContent = "Tempo decorrido: 0 s";
    elementos.overlay.hidden = false;
    elementos.botaoCalcular.disabled = true;
    elementos.botaoGraficos.disabled = true;

    timerRelogio = setInterval(() => {
        const segundos = Math.floor((Date.now() - inicioProcessamento) / 1000);
        elementos.overlayTempo.textContent = `Tempo decorrido: ${segundos} s`;
    }, 500);

    timerAviso = setTimeout(() => {
        elementos.overlayMensagem.textContent =
            "O cálculo ainda está em andamento. " +
            "Expressões simbólicas mais complexas podem levar alguns segundos.";
    }, CONFIG.timeoutAvisoMs);

    timerTimeout = setTimeout(() => {
        cancelarProcessamento(
            "O cálculo ultrapassou o limite de 30 segundos e foi interrompido."
        );
    }, CONFIG.timeoutMaximoMs);

    pedidoAtual.finalidade = finalidade;
}

function encerrarProcessamento() {
    clearTimeout(timerAviso);
    clearTimeout(timerTimeout);
    clearInterval(timerRelogio);

    timerAviso = null;
    timerTimeout = null;
    timerRelogio = null;
    inicioProcessamento = null;

    elementos.overlay.hidden = true;

    if (workerPronto) {
        elementos.botaoCalcular.disabled = false;
    }

    elementos.botaoGraficos.disabled = !ultimoModeloValido;
    pedidoAtual = null;
}

function cancelarProcessamento(
    mensagem = "Cálculo cancelado pelo usuário."
) {
    if (!pedidoAtual) {
        return;
    }

    clearTimeout(timerAviso);
    clearTimeout(timerTimeout);
    clearInterval(timerRelogio);
    pedidoAtual = null;
    elementos.overlay.hidden = true;

    invalidarVisualizacaoDoResultado();

    elementos.resultado.innerHTML = `
        <div class="mensagem-aviso">
            ${escaparHtml(mensagem)}
        </div>
    `;

    elementos.status.textContent = "O cálculo foi interrompido.";

    criarWorker();
}


/* ============================================================
   3. VALIDAÇÃO SEGURA DAS ENTRADAS
   ============================================================ */

function nomesUsados(texto) {
    return texto.match(/[A-Za-z_]+/g) || [];
}

function validarParenteses(texto) {
    let profundidade = 0;
    let maxima = 0;

    for (const caractere of texto) {
        if (caractere === "(") {
            profundidade += 1;
            maxima = Math.max(maxima, profundidade);
        }

        if (caractere === ")") {
            profundidade -= 1;

            if (profundidade < 0) {
                return {
                    ok: false,
                    mensagem: "Há um parêntese de fechamento sem abertura correspondente."
                };
            }
        }
    }

    if (profundidade !== 0) {
        return {
            ok: false,
            mensagem: "Os parênteses da expressão não estão balanceados."
        };
    }

    if (maxima > CONFIG.maxProfundidadeParenteses) {
        return {
            ok: false,
            mensagem: "A expressão contém parênteses aninhados demais para o modo interativo."
        };
    }

    return { ok: true };
}

function validarExpoentesDiretos(texto) {
    const normalizado = texto.replaceAll("^", "**");
    const padrao = /\*\*\s*\(?\s*([+-]?\d+(?:\.\d+)?)\s*\)?/g;
    let encontrou;

    while ((encontrou = padrao.exec(normalizado)) !== null) {
        const expoente = Math.abs(Number(encontrou[1]));

        if (Number.isFinite(expoente) && expoente > CONFIG.maxExpoenteDireto) {
            return {
                ok: false,
                mensagem:
                    `Expoente muito alto detectado: ${encontrou[1]}. ` +
                    "Verifique se houve erro de digitação."
            };
        }
    }

    return { ok: true };
}

function validarExpressao(
    texto,
    { permitirT = true, nomeCampo = "expressão" } = {}
) {
    const limpa = texto.trim();

    if (!limpa) {
        return { ok: false, mensagem: `Preencha ${nomeCampo}.` };
    }

    if (limpa.length > CONFIG.maxCaracteresExpressao) {
        return {
            ok: false,
            mensagem: `${nomeCampo} é longa demais para o modo interativo.`
        };
    }

    const multiplicacaoImplicita = /(?:\d\s*t|\d\s*\(|\bt\s*\(|\)\s*(?:\d|t|\())/;

    if (multiplicacaoImplicita.test(limpa)) {
        return {
            ok: false,
            mensagem:
                "Use * para indicar multiplicação. " +
                "Exemplo: escreva 2*t, e não 2t."
        };
    }

    const caracteresPermitidos = /^[0-9A-Za-z_+\-*/^().,\s]+$/;

    if (!caracteresPermitidos.test(limpa)) {
        return {
            ok: false,
            mensagem:
                `${nomeCampo} contém caracteres não reconhecidos. ` +
                "Abra o Guia de símbolos matemáticos para ver a sintaxe aceita."
        };
    }

    const permitidos = new Set([
        "t", "sqrt", "sin", "cos", "tan",
        "exp", "log", "abs", "Abs", "pi", "E"
    ]);

    for (const nome of nomesUsados(limpa)) {
        if (!permitidos.has(nome)) {
            return {
                ok: false,
                mensagem:
                    `Símbolo ou função não reconhecida: "${nome}". ` +
                    "Use apenas os símbolos descritos no guia."
            };
        }

        if (!permitirT && nome === "t") {
            return {
                ok: false,
                mensagem: `${nomeCampo} deve ser numérica e não pode depender de t.`
            };
        }
    }

    const operadores = (limpa.match(/[+\-*/^]/g) || []).length;

    if (operadores > CONFIG.maxOperadores) {
        return {
            ok: false,
            mensagem: `${nomeCampo} contém operações demais para o modo interativo.`
        };
    }

    const parenteses = validarParenteses(limpa);
    if (!parenteses.ok) {
        return parenteses;
    }

    const expoentes = validarExpoentesDiretos(limpa);
    if (!expoentes.ok) {
        return expoentes;
    }

    return { ok: true };
}

function validarDominio(inicio, fim, nome = "domínio") {
    const i = Number(inicio);
    const f = Number(fim);

    if (!Number.isFinite(i) || !Number.isFinite(f)) {
        return {
            ok: false,
            mensagem: `Preencha corretamente o ${nome}.`
        };
    }

    if (f <= i) {
        return {
            ok: false,
            mensagem: `No ${nome}, o tempo final deve ser maior que o tempo inicial.`
        };
    }

    return { ok: true };
}

function construirPayload() {
    const acao = elementos.seletorAcao.value;
    const funcao = elementos.funcao.value.trim();
    const tInicial = elementos.tInicial.value;
    const tFinal = elementos.tFinal.value;

    const testeFuncao = validarExpressao(funcao, {
        permitirT: true,
        nomeCampo: "a função x(t)"
    });

    if (!testeFuncao.ok) {
        return testeFuncao;
    }

    const testeDominio = validarDominio(tInicial, tFinal, "domínio físico");
    if (!testeDominio.ok) {
        return testeDominio;
    }

    const payload = {
        acao,
        funcao,
        t_inicial: Number(tInicial),
        t_final: Number(tFinal),
        entrada_extra: "",
        intervalo_t1: "",
        intervalo_t2: "",
        funcao_b: "",
        t_b_inicial: 0,
        t_b_final: 1,
        comparacao_tipo: elementos.comparacaoTipo.value
    };

    if (["avaliar", "posicao", "velocidade", "aceleracao"].includes(acao)) {
        const valor = elementos.entradaExtra.value.trim();
        const testeValor = validarExpressao(valor, {
            permitirT: false,
            nomeCampo: "o valor solicitado"
        });

        if (!testeValor.ok) {
            return testeValor;
        }

        payload.entrada_extra = valor;
    }

    if (acao === "medias_intervalo" || acao === "distancia_escalar") {
        const t1 = elementos.intervaloT1.value.trim();
        const t2 = elementos.intervaloT2.value.trim();

        const testeT1 = validarExpressao(t1, {
            permitirT: false,
            nomeCampo: "o instante t₁"
        });

        if (!testeT1.ok) {
            return testeT1;
        }

        const testeT2 = validarExpressao(t2, {
            permitirT: false,
            nomeCampo: "o instante t₂"
        });

        if (!testeT2.ok) {
            return testeT2;
        }

        payload.intervalo_t1 = t1;
        payload.intervalo_t2 = t2;
    }

    if (acao === "comparar") {
        const funcaoB = elementos.funcaoB.value.trim();
        const testeFuncaoB = validarExpressao(funcaoB, {
            permitirT: true,
            nomeCampo: "a função xB(t)"
        });

        if (!testeFuncaoB.ok) {
            return testeFuncaoB;
        }

        const testeDominioB = validarDominio(
            elementos.tBInicial.value,
            elementos.tBFinal.value,
            "domínio físico da partícula B"
        );

        if (!testeDominioB.ok) {
            return testeDominioB;
        }

        payload.funcao_b = funcaoB;
        payload.t_b_inicial = Number(elementos.tBInicial.value);
        payload.t_b_final = Number(elementos.tBFinal.value);
    }

    return { ok: true, payload };
}


/* ============================================================
   4. INTERFACE DINÂMICA
   ============================================================ */

function atualizarCamposExtras() {
    const acao = elementos.seletorAcao.value;

    elementos.entradaExtraContainer.hidden = true;
    elementos.intervaloContainer.hidden = true;
    elementos.comparacaoContainer.hidden = true;

    if (acao === "avaliar") {
        elementos.entradaExtraContainer.hidden = false;
        elementos.entradaExtraLabel.textContent = "Instante t₀";
        elementos.entradaExtraAjuda.textContent = "Exemplos: 3, 1/2 ou 2.5";
        return;
    }

    if (acao === "posicao") {
        elementos.entradaExtraContainer.hidden = false;
        elementos.entradaExtraLabel.textContent = "Posição procurada x (m)";
        elementos.entradaExtraAjuda.textContent = "Exemplos: 300, -5 ou 1/2";
        return;
    }

    if (acao === "velocidade") {
        elementos.entradaExtraContainer.hidden = false;
        elementos.entradaExtraLabel.textContent = "Velocidade procurada v (m/s)";
        elementos.entradaExtraAjuda.textContent = "Exemplos: 20, -5 ou 10/3";
        return;
    }

    if (acao === "aceleracao") {
        elementos.entradaExtraContainer.hidden = false;
        elementos.entradaExtraLabel.textContent = "Aceleração procurada a (m/s²)";
        elementos.entradaExtraAjuda.textContent = "Exemplos: 12, -9.8 ou 5/2";
        return;
    }

    if (acao === "medias_intervalo" || acao === "distancia_escalar") {
        elementos.intervaloContainer.hidden = false;
        return;
    }

    if (acao === "comparar") {
        elementos.comparacaoContainer.hidden = false;
    }
}

function restaurarExemplo() {
    elementos.funcao.value = "20*t - 5*t**3";
    elementos.tInicial.value = "-2";
    elementos.tFinal.value = "2";
    elementos.seletorAcao.value = "modelo";
    elementos.entradaExtra.value = "0";
    elementos.intervaloT1.value = "0";
    elementos.intervaloT2.value = "1";
    elementos.funcaoB.value = "t**2";
    elementos.tBInicial.value = "-2";
    elementos.tBFinal.value = "2";
    elementos.comparacaoTipo.value = "posicao";

    atualizarCamposExtras();
    invalidarVisualizacaoDoResultado();
    elementos.resultado.innerHTML = "";
    elementos.status.textContent = workerPronto
        ? "Motor Python/SymPy pronto."
        : "Preparando motor Python/SymPy...";
}


/* ============================================================
   5. FORMATAÇÃO E RENDERIZAÇÃO
   ============================================================ */

function escaparHtml(valor) {
    return String(valor)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatarNumero(exato, numerico, unidade = "") {
    const direto = Number(exato);
    const num = Number(numerico);
    const sufixo = unidade ? ` ${unidade}` : "";

    if (
        Number.isFinite(direto) &&
        Number.isFinite(num) &&
        Math.abs(direto - num) < 1e-12
    ) {
        return `${escaparHtml(exato)}${sufixo}`;
    }

    return `${escaparHtml(exato)}${sufixo} (≈ ${num.toFixed(9)}${sufixo})`;
}

function formatarValor(objeto, unidade = "") {
    return formatarNumero(objeto.exato, objeto.numerico, unidade);
}

function formatarTempo(objeto) {
    const direto = Number(objeto.exato);

    if (
        Number.isFinite(direto) &&
        Math.abs(direto - Number(objeto.numerico)) < 1e-12
    ) {
        return `t = ${escaparHtml(objeto.exato)} s`;
    }

    return `t = ${Number(objeto.numerico).toFixed(9)} s (${escaparHtml(objeto.exato)})`;
}

function listaTempos(lista) {
    if (!lista || lista.length === 0) {
        return "<p>Nenhum instante.</p>";
    }

    return `<ul>${lista.map(item => `<li>${formatarTempo(item)}</li>`).join("")}</ul>`;
}

function listaIntervalos(intervalos) {
    if (!intervalos || intervalos.length === 0) {
        return "<p>Nenhum intervalo.</p>";
    }

    return `<ul>${intervalos.map(intervalo => `<li>${escaparHtml(intervalo)}</li>`).join("")}</ul>`;
}

function renderizarSinal(titulo, simbolo, dados) {
    let zerosHtml = "";

    if (dados.zero_tipo === "todo_dominio") {
        zerosHtml = `<p>${escaparHtml(dados.zero_texto)} — todo o domínio.</p>`;
    } else if (dados.zero_tipo === "pontos") {
        zerosHtml = listaTempos(dados.zeros);
    } else {
        zerosHtml = "<p>Nenhum instante.</p>";
    }

    return `
        <section>
            <h3>${titulo}</h3>
            <p><strong>${simbolo} &gt; 0 em:</strong></p>
            ${listaIntervalos(dados.positivo)}
            <p><strong>${simbolo} &lt; 0 em:</strong></p>
            ${listaIntervalos(dados.negativo)}
            <p><strong>${simbolo} = 0 em:</strong></p>
            ${zerosHtml}
        </section>
    `;
}

function renderizarComparacao(dados) {
    let html = `
        <hr>
        <h3>COMPARAÇÃO ENTRE PARTÍCULAS</h3>

        <p><strong>Partícula A:</strong></p>
        <p>xA(t) = ${escaparHtml(dados.x)}</p>
        <p>vA(t) = ${escaparHtml(dados.v)}</p>
        <p>Domínio A: ${escaparHtml(dados.t_inicial)} ≤ t ≤ ${escaparHtml(dados.t_final)}</p>

        <p><strong>Partícula B:</strong></p>
        <p>xB(t) = ${escaparHtml(dados.x_b)}</p>
        <p>vB(t) = ${escaparHtml(dados.v_b)}</p>
        <p>Domínio B: ${escaparHtml(dados.t_b_inicial)} ≤ t ≤ ${escaparHtml(dados.t_b_final)}</p>
    `;

    if (dados.dominio_comum_vazio) {
        return html + "<p>As partículas não possuem domínio físico comum.</p>";
    }

    html += `
        <p><strong>Domínio físico comum:</strong> ${escaparHtml(dados.dominio_comum)}</p>
        <p><strong>Condição física:</strong> ${escaparHtml(dados.comparacao_nome)}</p>
    `;

    if (dados.comparacao_resultado_tipo === "nenhuma") {
        html += "<p>Não foram encontrados instantes que satisfaçam a condição dentro do domínio físico comum.</p>";
    } else if (dados.comparacao_resultado_tipo === "todo_dominio") {
        html += "<p>A igualdade é satisfeita em todo o domínio físico comum.</p>";
    } else if (dados.comparacao_resultado_tipo === "pontos") {
        const tempos = dados.comparacao_exatas.map((exato, i) => ({
            exato,
            numerico: dados.comparacao_numericas[i]
        }));
        html += `<p><strong>Instantes encontrados:</strong></p>${listaTempos(tempos)}`;
    } else {
        html += `
            <p>O resultado simbólico não pôde ser reduzido automaticamente a instantes isolados.</p>
            <p>${escaparHtml(dados.comparacao_texto)}</p>
        `;
    }

    return html;
}

function renderizarResultado(dados) {
    let html = `
        <p><strong>Domínio:</strong> ${escaparHtml(dados.t_inicial)} ≤ t ≤ ${escaparHtml(dados.t_final)}</p>
        <p><strong>x(t):</strong> ${escaparHtml(dados.x)}</p>
        <p><strong>v(t):</strong> ${escaparHtml(dados.v)}</p>
        <p><strong>a(t):</strong> ${escaparHtml(dados.a)}</p>
    `;

    if (dados.tipo_operacao === "avaliacao") {
        html += `<hr><p><strong>Instante avaliado:</strong> ${formatarTempo(dados.instante)}</p>`;

        if (!dados.avaliacao_valida) {
            html += `<p>${escaparHtml(dados.avaliacao_mensagem)}</p>`;
        } else {
            html += `
                <p><strong>Estado da partícula:</strong></p>
                <p>x(${escaparHtml(dados.instante.exato)}) = ${formatarValor(dados.x_avaliado, "m")}</p>
                <p>v(${escaparHtml(dados.instante.exato)}) = ${formatarValor(dados.v_avaliado, "m/s")}</p>
                <p>a(${escaparHtml(dados.instante.exato)}) = ${formatarValor(dados.a_avaliado, "m/s²")}</p>
            `;
        }
    }

    if (dados.tipo_operacao === "evento") {
        html += `
            <hr>
            <p><strong>Condição física:</strong> ${escaparHtml(dados.grandeza_nome)} = ${escaparHtml(dados.alvo)} ${escaparHtml(dados.unidade)}</p>
        `;

        if (dados.tipo_evento === "nenhuma") {
            html += "<p>Não foram encontrados instantes que satisfaçam essa condição dentro do domínio informado.</p>";
        } else if (dados.tipo_evento === "todo_dominio") {
            html += "<p>A condição é satisfeita em todo o domínio informado.</p>";
            if (dados.acao === "parar") {
                html += "<p>A partícula permanece em repouso durante todo o intervalo analisado.</p>";
            }
        } else if (dados.tipo_evento === "pontos") {
            const tempos = dados.solucoes_exatas.map((exato, i) => ({
                exato,
                numerico: dados.solucoes_numericas[i]
            }));
            html += `<p><strong>Instantes encontrados:</strong></p>${listaTempos(tempos)}`;
        } else {
            html += `
                <p>O SymPy encontrou uma solução, mas ela não pôde ser reduzida automaticamente a instantes isolados.</p>
                <p><strong>Solução simbólica:</strong> ${escaparHtml(dados.solucoes_texto)}</p>
            `;
        }
    }

    if (dados.tipo_operacao === "extremos") {
        html += `
            <hr>
            <p><strong>Análise:</strong> extremos globais de ${escaparHtml(dados.extremos_grandeza_nome)} no domínio informado.</p>
        `;

        if (dados.extremos_tipo === "limitacao") {
            html += `<p>${escaparHtml(dados.extremos_mensagem)}</p>`;
        } else if (dados.extremos_tipo === "constante") {
            html += `
                <p>A grandeza é constante em todo o domínio.</p>
                <p><strong>Mínimo global:</strong> ${formatarValor(dados.minimo_valor, dados.extremos_unidade)}</p>
                <p><strong>Máximo global:</strong> ${formatarValor(dados.maximo_valor, dados.extremos_unidade)}</p>
                <p>Ambos ocorrem em todo o intervalo analisado.</p>
            `;
        } else {
            html += `
                <p><strong>Mínimo global:</strong> ${formatarValor(dados.minimo_valor, dados.extremos_unidade)}</p>
                <p><strong>Ocorre em:</strong></p>
                ${listaTempos(dados.minimo_tempos)}
                <p><strong>Máximo global:</strong> ${formatarValor(dados.maximo_valor, dados.extremos_unidade)}</p>
                <p><strong>Ocorre em:</strong></p>
                ${listaTempos(dados.maximo_tempos)}
            `;
        }
    }

    if (dados.tipo_operacao === "medias_intervalo" || dados.tipo_operacao === "distancia_escalar") {
        html += "<hr>";

        if (!dados.intervalo_valido) {
            html += `
                <p><strong>Intervalo informado:</strong> ${escaparHtml(dados.intervalo_t1.exato)} → ${escaparHtml(dados.intervalo_t2.exato)} s</p>
                <p>${escaparHtml(dados.intervalo_mensagem)}</p>
            `;
        } else {
            html += `
                <p><strong>Intervalo analisado:</strong> ${escaparHtml(dados.intervalo_t1.exato)} ≤ t ≤ ${escaparHtml(dados.intervalo_t2.exato)} s</p>
                <p><strong>Estado nas extremidades:</strong></p>
                <p>x(${escaparHtml(dados.intervalo_t1.exato)}) = ${formatarValor(dados.x_t1, "m")}</p>
                <p>x(${escaparHtml(dados.intervalo_t2.exato)}) = ${formatarValor(dados.x_t2, "m")}</p>
                <p>v(${escaparHtml(dados.intervalo_t1.exato)}) = ${formatarValor(dados.v_t1, "m/s")}</p>
                <p>v(${escaparHtml(dados.intervalo_t2.exato)}) = ${formatarValor(dados.v_t2, "m/s")}</p>
                <p><strong>Δt:</strong> ${formatarValor(dados.delta_t, "s")}</p>
                <p><strong>Deslocamento Δx:</strong> ${formatarValor(dados.deslocamento, "m")}</p>
                <p><strong>Velocidade média:</strong> ${formatarValor(dados.velocidade_media, "m/s")}</p>
            `;

            if (dados.tipo_operacao === "medias_intervalo") {
                html += `<p><strong>Aceleração média:</strong> ${formatarValor(dados.aceleracao_media, "m/s²")}</p>`;
            }

            if (dados.tipo_operacao === "distancia_escalar") {
                if (dados.distancia_tipo === "limitacao") {
                    html += `<p>${escaparHtml(dados.distancia_mensagem)}</p>`;
                } else {
                    html += `
                        <p><strong>Pontos usados para dividir o percurso:</strong></p>
                        ${listaTempos(dados.pontos_inversao)}
                        <p><strong>Distância total:</strong> ${formatarValor(dados.distancia_total, "m")}</p>
                        <p><strong>Velocidade escalar média:</strong> ${formatarValor(dados.velocidade_escalar_media, "m/s")}</p>
                    `;
                }
            }
        }
    }

    if (dados.tipo_operacao === "sinais") {
        html += `
            <hr>
            <p><strong>Análise de sinal no domínio físico informado.</strong></p>
            ${renderizarSinal("VELOCIDADE", "v(t)", dados.sinal_v)}
            ${renderizarSinal("ACELERAÇÃO", "a(t)", dados.sinal_a)}
        `;
    }

    if (dados.tipo_operacao === "comparacao") {
        html += renderizarComparacao(dados);
    }

    elementos.resultado.innerHTML = html;
    elementos.status.textContent = "Cálculo concluído.";

    elementos.painelResultado.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function mostrarErro(mensagem) {
    invalidarVisualizacaoDoResultado();

    elementos.resultado.innerHTML = `
        <div class="mensagem-erro">
            <strong>Não foi possível concluir o cálculo.</strong>
            <p>${escaparHtml(mensagem)}</p>
        </div>
    `;

    elementos.status.textContent = "Revise os dados informados.";

    elementos.painelResultado.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


/* ============================================================
   6. GRÁFICOS
   ============================================================ */

function destruirGraficosPlotly() {
    if (typeof Plotly === "undefined") {
        return;
    }

    for (const id of [
        "grafico-posicao",
        "grafico-velocidade",
        "grafico-aceleracao"
    ]) {
        const elemento = document.getElementById(id);
        if (elemento) {
            Plotly.purge(elemento);
        }
    }
}

function ocultarGraficos() {
    destruirGraficosPlotly();
    elementos.graficosContainer.innerHTML = "";
    elementos.graficosContainer.hidden = true;
    graficosVisiveis = false;
    elementos.botaoGraficos.textContent = "Gerar gráficos";
}

function invalidarVisualizacaoDoResultado() {
    ocultarGraficos();
    ultimoModeloValido = null;
    elementos.acoesResultado.hidden = true;
    elementos.botaoGraficos.disabled = true;
}

function registrarModeloValido(payload) {
    ultimoModeloValido = {
        funcao: payload.funcao,
        t_inicial: payload.t_inicial,
        t_final: payload.t_final
    };

    elementos.acoesResultado.hidden = false;
    elementos.botaoGraficos.disabled = false;
    elementos.botaoGraficos.textContent = "Gerar gráficos";
}

function layoutGrafico(titulo, eixoY) {
    return {
        title: { text: titulo, x: 0.02, xanchor: "left" },
        margin: { l: 58, r: 18, t: 55, b: 58 },
        xaxis: { title: "Tempo t (s)", zeroline: true, showgrid: true },
        yaxis: { title: eixoY, zeroline: true, showgrid: true },
        showlegend: false,
        autosize: true
    };
}

function desenharGrafico(id, tempos, valores, titulo, eixoY) {
    Plotly.newPlot(
        id,
        [{
            x: tempos,
            y: valores,
            type: "scatter",
            mode: "lines",
            hovertemplate:
                "t = %{x:.6g} s<br>" +
                `${eixoY} = %{y:.6g}` +
                "<extra></extra>"
        }],
        layoutGrafico(titulo, eixoY),
        {
            responsive: true,
            displaylogo: false,
            scrollZoom: false
        }
    );
}

function renderizarGraficos(dados) {
    if (typeof Plotly === "undefined") {
        mostrarErro(
            "A biblioteca de gráficos não foi carregada. Verifique a conexão com a internet."
        );
        return;
    }

    elementos.graficosContainer.innerHTML = `
        <hr>
        <section class="graficos-movimento">
            <h3>GRÁFICOS DO MOVIMENTO</h3>
            <p>Foram gerados ${dados.grafico_pontos} pontos no domínio físico do último cálculo válido.</p>
            <div class="grafico-card"><div id="grafico-posicao" class="grafico"></div></div>
            <div class="grafico-card"><div id="grafico-velocidade" class="grafico"></div></div>
            <div class="grafico-card"><div id="grafico-aceleracao" class="grafico"></div></div>
        </section>
    `;

    elementos.graficosContainer.hidden = false;

    desenharGrafico("grafico-posicao", dados.tempos, dados.x_valores, "Posição x(t)", "Posição x (m)");
    desenharGrafico("grafico-velocidade", dados.tempos, dados.v_valores, "Velocidade v(t)", "Velocidade v (m/s)");
    desenharGrafico("grafico-aceleracao", dados.tempos, dados.a_valores, "Aceleração a(t)", "Aceleração a (m/s²)");

    graficosVisiveis = true;
    elementos.botaoGraficos.textContent = "Ocultar gráficos";
    elementos.status.textContent = "Gráficos gerados.";
}

function gerarGraficos() {
    if (!ultimoModeloValido) {
        return;
    }

    if (graficosVisiveis) {
        ocultarGraficos();
        return;
    }

    enviarCalculo(
        { acao: "graficos", ...ultimoModeloValido },
        "Gerando gráficos do movimento...",
        "graficos"
    );
}


/* ============================================================
   7. ENVIO DOS CÁLCULOS
   ============================================================ */

function enviarCalculo(payload, mensagem, finalidade = "calculo") {
    if (!workerPronto || !worker) {
        mostrarErro("O motor Python/SymPy ainda não está pronto.");
        return;
    }

    const id = proximoId++;
    pedidoAtual = { id, payload, finalidade };
    iniciarProcessamento(mensagem, finalidade);

    worker.postMessage({
        tipo: "calcular",
        id,
        payload
    });
}

function calcularMovimento() {
    const validacao = construirPayload();

    if (!validacao.ok) {
        mostrarErro(validacao.mensagem);
        return;
    }

    invalidarVisualizacaoDoResultado();
    elementos.resultado.innerHTML = "";

    enviarCalculo(
        validacao.payload,
        "O COMPUTA está processando a expressão...",
        "calculo"
    );
}


/* ============================================================
   8. EVENTOS
   ============================================================ */

 elementos.seletorAcao.addEventListener("change", () => {
    atualizarCamposExtras();
    invalidarVisualizacaoDoResultado();
});

elementos.botaoCalcular.addEventListener("click", calcularMovimento);
elementos.botaoRestaurar.addEventListener("click", restaurarExemplo);
elementos.botaoGraficos.addEventListener("click", gerarGraficos);
elementos.botaoCancelar.addEventListener("click", () => cancelarProcessamento());

for (const campo of [
    elementos.funcao,
    elementos.tInicial,
    elementos.tFinal,
    elementos.entradaExtra,
    elementos.intervaloT1,
    elementos.intervaloT2,
    elementos.funcaoB,
    elementos.tBInicial,
    elementos.tBFinal
]) {
    campo.addEventListener("input", invalidarVisualizacaoDoResultado);
}

elementos.comparacaoTipo.addEventListener("change", invalidarVisualizacaoDoResultado);

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && pedidoAtual) {
        cancelarProcessamento();
    }

    if (
        event.key === "Enter" &&
        !pedidoAtual &&
        workerPronto &&
        event.target.tagName !== "SELECT"
    ) {
        calcularMovimento();
    }
});


/* ============================================================
   9. INICIALIZAÇÃO
   ============================================================ */

elementos.botaoGraficos.disabled = true;
atualizarCamposExtras();
criarWorker();
