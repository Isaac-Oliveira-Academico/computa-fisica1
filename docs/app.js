const botao =
    document.getElementById("calcular");

const resultado =
    document.getElementById("resultado");

const status =
    document.getElementById("status");

const seletorAcao =
    document.getElementById("acao");

const entradaExtraContainer =
    document.getElementById(
        "entrada-extra-container"
    );

const entradaExtraLabel =
    document.getElementById(
        "entrada-extra-label"
    );

const entradaExtra =
    document.getElementById(
        "entrada-extra"
    );

const entradaExtraAjuda =
    document.getElementById(
        "entrada-extra-ajuda"
    );

const intervaloContainer =
    document.getElementById(
        "intervalo-container"
    );

const intervaloT1 =
    document.getElementById(
        "intervalo-t1"
    );

const intervaloT2 =
    document.getElementById(
        "intervalo-t2"
    );


let pyodide = null;


/*
    ============================================================
    INICIALIZAÇÃO
    ============================================================
*/

async function iniciarPython() {

    status.textContent =
        "Carregando Python...";

    pyodide =
        await loadPyodide();

    status.textContent =
        "Carregando SymPy...";

    await pyodide.loadPackage(
        "sympy"
    );

    status.textContent =
        "Motor Python/SymPy pronto.";

    botao.disabled = false;

    botao.textContent =
        "Calcular";
}


/*
    ============================================================
    INTERFACE
    ============================================================

    Há agora três tipos de operações:

    1. Sem entrada extra:
       modelo, parar, extremos.

    2. Uma entrada:
       avaliar, posição, velocidade, aceleração.

    3. Duas entradas:
       análise em intervalo t1 -> t2.
*/

function atualizarCamposExtras() {

    const acao =
        seletorAcao.value;


    entradaExtraContainer.hidden =
        true;

    intervaloContainer.hidden =
        true;


    if (acao === "avaliar") {

        entradaExtraContainer.hidden =
            false;

        entradaExtraLabel.textContent =
            "Instante t₀:";

        entradaExtraAjuda.textContent =
            "Exemplos: 3, 1/2 ou 2.5";

        return;
    }


    if (acao === "posicao") {

        entradaExtraContainer.hidden =
            false;

        entradaExtraLabel.textContent =
            "Posição procurada x (m):";

        entradaExtraAjuda.textContent =
            "Exemplos: 300, -5 ou 1/2";

        return;
    }


    if (acao === "velocidade") {

        entradaExtraContainer.hidden =
            false;

        entradaExtraLabel.textContent =
            "Velocidade procurada v (m/s):";

        entradaExtraAjuda.textContent =
            "Exemplos: 20, -5 ou 10/3";

        return;
    }


    if (acao === "aceleracao") {

        entradaExtraContainer.hidden =
            false;

        entradaExtraLabel.textContent =
            "Aceleração procurada a (m/s²):";

        entradaExtraAjuda.textContent =
            "Exemplos: 12, -9.8 ou 5/2";

        return;
    }


    if (acao === "medias_intervalo") {

        intervaloContainer.hidden =
            false;

        return;
    }
}


/*
    ============================================================
    VALIDAÇÕES
    ============================================================
*/

function funcaoValida(texto) {

    const padrao =
        /^[0-9tT+\-*/().\s]+$/;

    return (
        texto.trim().length > 0 &&
        padrao.test(texto)
    );
}


function valorNumericoValido(texto) {

    const padrao =
        /^[0-9+\-*/().\s]+$/;

    return (
        texto.trim().length > 0 &&
        padrao.test(texto)
    );
}


/*
    ============================================================
    FORMATAÇÃO
    ============================================================
*/

function formatarValor(
    exato,
    numerico,
    unidade
) {

    const valorDireto =
        Number(exato);


    if (
        Number.isFinite(valorDireto) &&
        Math.abs(
            valorDireto - numerico
        ) < 1e-12
    ) {

        return `${exato} ${unidade}`;
    }


    return `
        ${exato} ${unidade}
        (≈ ${numerico.toFixed(9)} ${unidade})
    `;
}


function formatarTempo(
    exato,
    numerico
) {

    const valorDireto =
        Number(exato);


    if (
        Number.isFinite(valorDireto) &&
        Math.abs(
            valorDireto - numerico
        ) < 1e-12
    ) {

        return `t = ${exato} s`;
    }


    return `
        t = ${numerico.toFixed(9)} s
        (${exato})
    `;
}


function listaTempos(
    exatos,
    numericos
) {

    let html =
        "<ul>";


    for (
        let i = 0;
        i < numericos.length;
        i++
    ) {

        html += `
            <li>
                ${formatarTempo(
                    exatos[i],
                    Number(
                        numericos[i]
                    )
                )}
            </li>
        `;
    }


    html +=
        "</ul>";


    return html;
}


/*
    ============================================================
    FUNÇÃO PRINCIPAL
    ============================================================
*/

async function calcularMovimento() {

    const funcao =
        document
            .getElementById("funcao")
            .value
            .trim();

    const tInicial =
        Number(
            document
                .getElementById("t-inicial")
                .value
        );

    const tFinal =
        Number(
            document
                .getElementById("t-final")
                .value
        );

    const acao =
        seletorAcao.value;

    const valorExtraTexto =
        entradaExtra.value.trim();

    const intervaloT1Texto =
        intervaloT1.value.trim();

    const intervaloT2Texto =
        intervaloT2.value.trim();


    /*
        --------------------------------------------------------
        FUNÇÃO x(t)
        --------------------------------------------------------
    */

    if (!funcaoValida(funcao)) {

        resultado.innerHTML = `
            <p>
                Erro: a função contém caracteres
                ou símbolos não permitidos.
            </p>

            <p>
                Use expressões como:
                20*t - 5*t**3
            </p>
        `;

        return;
    }


    /*
        --------------------------------------------------------
        DOMÍNIO FÍSICO
        --------------------------------------------------------
    */

    if (
        !Number.isFinite(tInicial) ||
        !Number.isFinite(tFinal)
    ) {

        resultado.innerHTML = `
            <p>
                Erro: informe valores numéricos
                válidos para o domínio temporal.
            </p>
        `;

        return;
    }


    if (tInicial >= tFinal) {

        resultado.innerHTML = `
            <p>
                Erro: o tempo final deve ser
                maior que o tempo inicial.
            </p>
        `;

        return;
    }


    /*
        --------------------------------------------------------
        UMA ENTRADA EXTRA
        --------------------------------------------------------
    */

    const precisaValorExtra =
        acao === "avaliar" ||
        acao === "posicao" ||
        acao === "velocidade" ||
        acao === "aceleracao";


    if (
        precisaValorExtra &&
        !valorNumericoValido(
            valorExtraTexto
        )
    ) {

        resultado.innerHTML = `
            <p>
                Erro: informe um valor válido.
            </p>

            <p>
                Exemplos:
                3, -5, 1/2 ou 2.5
            </p>
        `;

        return;
    }


    /*
        --------------------------------------------------------
        INTERVALO t1 -> t2
        --------------------------------------------------------
    */

    const precisaIntervalo =
        acao === "medias_intervalo";


    if (
        precisaIntervalo &&
        (
            !valorNumericoValido(
                intervaloT1Texto
            )
            ||
            !valorNumericoValido(
                intervaloT2Texto
            )
        )
    ) {

        resultado.innerHTML = `
            <p>
                Erro: informe valores válidos
                para t₁ e t₂.
            </p>

            <p>
                Exemplos:
                0, 3, 1/2 ou 2.5
            </p>
        `;

        return;
    }


    /*
        --------------------------------------------------------
        JAVASCRIPT -> PYTHON
        --------------------------------------------------------
    */

    pyodide.globals.set(
        "funcao_js",
        funcao
    );

    pyodide.globals.set(
        "t_inicial_js",
        tInicial
    );

    pyodide.globals.set(
        "t_final_js",
        tFinal
    );

    pyodide.globals.set(
        "acao_js",
        acao
    );

    pyodide.globals.set(
        "valor_extra_js",
        precisaValorExtra
            ? valorExtraTexto
            : ""
    );

    pyodide.globals.set(
        "intervalo_t1_js",
        precisaIntervalo
            ? intervaloT1Texto
            : ""
    );

    pyodide.globals.set(
        "intervalo_t2_js",
        precisaIntervalo
            ? intervaloT2Texto
            : ""
    );


    try {

        const resposta =
            await pyodide.runPythonAsync(`

import sympy as sp


# =============================================================
# 1. VARIÁVEL SIMBÓLICA
# =============================================================

t = sp.symbols(
    "t",
    real=True
)


# =============================================================
# 2. FUNÇÃO POSIÇÃO
# =============================================================

x = sp.sympify(
    funcao_js,
    locals={
        "t": t
    }
)


if not x.free_symbols.issubset({t}):

    raise ValueError(
        "A função só pode depender de t."
    )


# =============================================================
# 3. VELOCIDADE E ACELERAÇÃO
# =============================================================

v = sp.diff(
    x,
    t
)

a = sp.diff(
    v,
    t
)


# =============================================================
# 4. DOMÍNIO FÍSICO
# =============================================================

t_inicial_exato = sp.Rational(
    str(t_inicial_js)
)

t_final_exato = sp.Rational(
    str(t_final_js)
)

t_inicial = float(
    t_inicial_exato
)

t_final = float(
    t_final_exato
)

dominio = sp.Interval(
    t_inicial_exato,
    t_final_exato
)


# =============================================================
# 5. AÇÃO
# =============================================================

acao = str(
    acao_js
)


# =============================================================
# 6. VARIÁVEIS GERAIS
# =============================================================

tipo_operacao = ""

grandeza_nome = ""

unidade = ""

alvo = None


# =============================================================
# 7. EVENTOS
# =============================================================

tipo_evento = "nao_aplicavel"

solucoes_exatas = []

solucoes_numericas = []


# =============================================================
# 8. AVALIAÇÃO EM t0
# =============================================================

instante_exato = ""

instante_numerico = None

avaliacao_valida = False

avaliacao_mensagem = ""

x_avaliado_exato = ""

v_avaliado_exato = ""

a_avaliado_exato = ""

x_avaliado_numerico = None

v_avaliado_numerico = None

a_avaliado_numerico = None


# =============================================================
# 9. EXTREMOS
# =============================================================

extremos_tipo = "nao_aplicavel"

extremos_mensagem = ""

extremos_grandeza_nome = ""

extremos_unidade = ""

minimo_valor_exato = ""

minimo_valor_numerico = None

minimo_tempos_exatos = []

minimo_tempos_numericos = []

maximo_valor_exato = ""

maximo_valor_numerico = None

maximo_tempos_exatos = []

maximo_tempos_numericos = []


# =============================================================
# 10. MÉDIAS EM INTERVALO
# =============================================================

medias_valida = False

medias_mensagem = ""

media_t1_exato = ""

media_t2_exato = ""

media_t1_numerico = None

media_t2_numerico = None

delta_t_exato = ""

delta_t_numerico = None

x_t1_exato = ""

x_t2_exato = ""

x_t1_numerico = None

x_t2_numerico = None

v_t1_exato = ""

v_t2_exato = ""

v_t1_numerico = None

v_t2_numerico = None

deslocamento_exato = ""

deslocamento_numerico = None

velocidade_media_exato = ""

velocidade_media_numerico = None

aceleracao_media_exato = ""

aceleracao_media_numerico = None


# =============================================================
# 11. FUNÇÕES AUXILIARES
# =============================================================

def numero_real(expr):

    return float(
        sp.N(expr)
    )


def adicionar_candidato(
    lista,
    candidato
):

    for existente in lista:

        if (
            sp.simplify(
                existente - candidato
            )
            == 0
        ):

            return


    lista.append(
        candidato
    )


def calcular_extremos_globais(
    expressao,
    derivada
):

    resultado = {

        "tipo":
            "ok",

        "mensagem":
            "",

        "min_val_exato":
            "",

        "min_val_num":
            None,

        "min_t_exatos":
            [],

        "min_t_nums":
            [],

        "max_val_exato":
            "",

        "max_val_num":
            None,

        "max_t_exatos":
            [],

        "max_t_nums":
            []
    }


    # ---------------------------------------------------------
    # GRANDEZA CONSTANTE
    # ---------------------------------------------------------

    if sp.simplify(
        derivada
    ) == 0:

        valor = sp.simplify(
            expressao.subs(
                t,
                t_inicial_exato
            )
        )


        resultado[
            "tipo"
        ] = "constante"

        resultado[
            "min_val_exato"
        ] = str(
            valor
        )

        resultado[
            "min_val_num"
        ] = numero_real(
            valor
        )

        resultado[
            "max_val_exato"
        ] = str(
            valor
        )

        resultado[
            "max_val_num"
        ] = numero_real(
            valor
        )


        return resultado


    # ---------------------------------------------------------
    # PONTOS CRÍTICOS
    # ---------------------------------------------------------

    estacionarios = sp.solveset(
        derivada,
        t,
        domain=dominio
    )


    candidatos = []


    adicionar_candidato(
        candidatos,
        t_inicial_exato
    )

    adicionar_candidato(
        candidatos,
        t_final_exato
    )


    if estacionarios == sp.EmptySet:

        pass


    elif isinstance(
        estacionarios,
        sp.FiniteSet
    ):

        for ponto in estacionarios:

            adicionar_candidato(
                candidatos,
                ponto
            )


    elif estacionarios == dominio:

        valor = sp.simplify(
            expressao.subs(
                t,
                t_inicial_exato
            )
        )


        resultado[
            "tipo"
        ] = "constante"

        resultado[
            "min_val_exato"
        ] = str(
            valor
        )

        resultado[
            "min_val_num"
        ] = numero_real(
            valor
        )

        resultado[
            "max_val_exato"
        ] = str(
            valor
        )

        resultado[
            "max_val_num"
        ] = numero_real(
            valor
        )


        return resultado


    else:

        resultado[
            "tipo"
        ] = "limitacao"

        resultado[
            "mensagem"
        ] = (
            "Não foi possível reduzir simbolicamente "
            "os pontos críticos a um conjunto finito "
            "de instantes."
        )


        return resultado


    candidatos = sorted(
        candidatos,
        key=numero_real
    )


    valores = []


    for ponto in candidatos:

        valor_exato = sp.simplify(
            expressao.subs(
                t,
                ponto
            )
        )

        valor_num = numero_real(
            valor_exato
        )


        valores.append({

            "t_exato":
                ponto,

            "t_num":
                numero_real(
                    ponto
                ),

            "valor_exato":
                valor_exato,

            "valor_num":
                valor_num
        })


    min_num = min(
        item["valor_num"]
        for item
        in valores
    )

    max_num = max(
        item["valor_num"]
        for item
        in valores
    )


    tolerancia_min = (
        1e-10
        *
        max(
            1.0,
            abs(min_num)
        )
    )

    tolerancia_max = (
        1e-10
        *
        max(
            1.0,
            abs(max_num)
        )
    )


    min_itens = [

        item

        for item
        in valores

        if abs(
            item["valor_num"]
            -
            min_num
        )
        <=
        tolerancia_min
    ]


    max_itens = [

        item

        for item
        in valores

        if abs(
            item["valor_num"]
            -
            max_num
        )
        <=
        tolerancia_max
    ]


    resultado[
        "min_val_exato"
    ] = str(
        min_itens[0][
            "valor_exato"
        ]
    )

    resultado[
        "min_val_num"
    ] = min_num

    resultado[
        "min_t_exatos"
    ] = [

        str(
            item["t_exato"]
        )

        for item
        in min_itens
    ]

    resultado[
        "min_t_nums"
    ] = [

        item["t_num"]

        for item
        in min_itens
    ]


    resultado[
        "max_val_exato"
    ] = str(
        max_itens[0][
            "valor_exato"
        ]
    )

    resultado[
        "max_val_num"
    ] = max_num

    resultado[
        "max_t_exatos"
    ] = [

        str(
            item["t_exato"]
        )

        for item
        in max_itens
    ]

    resultado[
        "max_t_nums"
    ] = [

        item["t_num"]

        for item
        in max_itens
    ]


    return resultado


# =============================================================
# 12. MOSTRAR MODELO
# =============================================================

if acao == "modelo":

    tipo_operacao = "modelo"


# =============================================================
# 13. AVALIAR ESTADO EM t0
# =============================================================

elif acao == "avaliar":

    tipo_operacao = "avaliacao"


    instante = sp.sympify(
        valor_extra_js
    )


    if instante.free_symbols:

        raise ValueError(
            "O instante não pode conter variáveis."
        )


    instante_num = numero_real(
        instante
    )


    instante_exato = str(
        sp.simplify(
            instante
        )
    )

    instante_numerico = (
        instante_num
    )


    if (
        instante_num < t_inicial
        or
        instante_num > t_final
    ):

        avaliacao_valida = False

        avaliacao_mensagem = (
            "O instante informado está fora "
            "do domínio físico."
        )


    else:

        avaliacao_valida = True


        x_t0 = sp.simplify(
            x.subs(
                t,
                instante
            )
        )

        v_t0 = sp.simplify(
            v.subs(
                t,
                instante
            )
        )

        a_t0 = sp.simplify(
            a.subs(
                t,
                instante
            )
        )


        x_avaliado_exato = str(
            x_t0
        )

        v_avaliado_exato = str(
            v_t0
        )

        a_avaliado_exato = str(
            a_t0
        )


        x_avaliado_numerico = (
            numero_real(
                x_t0
            )
        )

        v_avaliado_numerico = (
            numero_real(
                v_t0
            )
        )

        a_avaliado_numerico = (
            numero_real(
                a_t0
            )
        )


# =============================================================
# 14. EVENTO DE POSIÇÃO
# =============================================================

elif acao == "posicao":

    tipo_operacao = "evento"

    expressao_evento = x

    grandeza_nome = "x(t)"

    unidade = "m"

    alvo = sp.sympify(
        valor_extra_js
    )


# =============================================================
# 15. EVENTO DE VELOCIDADE
# =============================================================

elif acao == "velocidade":

    tipo_operacao = "evento"

    expressao_evento = v

    grandeza_nome = "v(t)"

    unidade = "m/s"

    alvo = sp.sympify(
        valor_extra_js
    )


# =============================================================
# 16. EVENTO DE ACELERAÇÃO
# =============================================================

elif acao == "aceleracao":

    tipo_operacao = "evento"

    expressao_evento = a

    grandeza_nome = "a(t)"

    unidade = "m/s²"

    alvo = sp.sympify(
        valor_extra_js
    )


# =============================================================
# 17. PARTÍCULA PARA
# =============================================================

elif acao == "parar":

    tipo_operacao = "evento"

    expressao_evento = v

    grandeza_nome = "v(t)"

    unidade = "m/s"

    alvo = sp.Integer(0)


# =============================================================
# 18. EXTREMOS DE POSIÇÃO
# =============================================================

elif acao == "extremos_posicao":

    tipo_operacao = "extremos"

    extremos_grandeza_nome = (
        "posição x(t)"
    )

    extremos_unidade = "m"


    dados_extremos = (
        calcular_extremos_globais(
            x,
            v
        )
    )


# =============================================================
# 19. EXTREMOS DE VELOCIDADE
# =============================================================

elif acao == "extremos_velocidade":

    tipo_operacao = "extremos"

    extremos_grandeza_nome = (
        "velocidade v(t)"
    )

    extremos_unidade = "m/s"


    dados_extremos = (
        calcular_extremos_globais(
            v,
            a
        )
    )


# =============================================================
# 20. DESLOCAMENTO E MÉDIAS EM INTERVALO
# =============================================================

elif acao == "medias_intervalo":

    tipo_operacao = "medias"


    t1 = sp.sympify(
        intervalo_t1_js
    )

    t2 = sp.sympify(
        intervalo_t2_js
    )


    if (
        t1.free_symbols
        or
        t2.free_symbols
    ):

        raise ValueError(
            "Os instantes do intervalo "
            "não podem conter variáveis."
        )


    t1_num = numero_real(
        t1
    )

    t2_num = numero_real(
        t2
    )


    media_t1_exato = str(
        sp.simplify(
            t1
        )
    )

    media_t2_exato = str(
        sp.simplify(
            t2
        )
    )

    media_t1_numerico = (
        t1_num
    )

    media_t2_numerico = (
        t2_num
    )


    # ---------------------------------------------------------
    # VERIFICAÇÃO DO DOMÍNIO
    # ---------------------------------------------------------

    if (
        t1_num < t_inicial
        or
        t1_num > t_final
        or
        t2_num < t_inicial
        or
        t2_num > t_final
    ):

        medias_valida = False

        medias_mensagem = (
            "O intervalo informado ultrapassa "
            "o domínio físico do movimento."
        )


    # ---------------------------------------------------------
    # ORDEM DOS INSTANTES
    # ---------------------------------------------------------

    elif t2_num <= t1_num:

        medias_valida = False

        medias_mensagem = (
            "O instante t₂ deve ser maior "
            "que o instante t₁."
        )


    else:

        medias_valida = True


        # -----------------------------------------------------
        # ESTADO NAS EXTREMIDADES
        # -----------------------------------------------------

        x1 = sp.simplify(
            x.subs(
                t,
                t1
            )
        )

        x2 = sp.simplify(
            x.subs(
                t,
                t2
            )
        )

        v1 = sp.simplify(
            v.subs(
                t,
                t1
            )
        )

        v2 = sp.simplify(
            v.subs(
                t,
                t2
            )
        )


        # -----------------------------------------------------
        # INTERVALO DE TEMPO
        # -----------------------------------------------------

        delta_t = sp.simplify(
            t2 - t1
        )


        # -----------------------------------------------------
        # DESLOCAMENTO
        # -----------------------------------------------------

        deslocamento = sp.simplify(
            x2 - x1
        )


        # -----------------------------------------------------
        # VELOCIDADE MÉDIA
        # -----------------------------------------------------

        velocidade_media = sp.simplify(
            deslocamento
            /
            delta_t
        )


        # -----------------------------------------------------
        # ACELERAÇÃO MÉDIA
        # -----------------------------------------------------

        aceleracao_media = sp.simplify(
            (
                v2 - v1
            )
            /
            delta_t
        )


        # -----------------------------------------------------
        # RESULTADOS EXATOS
        # -----------------------------------------------------

        delta_t_exato = str(
            delta_t
        )

        x_t1_exato = str(
            x1
        )

        x_t2_exato = str(
            x2
        )

        v_t1_exato = str(
            v1
        )

        v_t2_exato = str(
            v2
        )

        deslocamento_exato = str(
            deslocamento
        )

        velocidade_media_exato = str(
            velocidade_media
        )

        aceleracao_media_exato = str(
            aceleracao_media
        )


        # -----------------------------------------------------
        # RESULTADOS NUMÉRICOS
        # -----------------------------------------------------

        delta_t_numerico = (
            numero_real(
                delta_t
            )
        )

        x_t1_numerico = (
            numero_real(
                x1
            )
        )

        x_t2_numerico = (
            numero_real(
                x2
            )
        )

        v_t1_numerico = (
            numero_real(
                v1
            )
        )

        v_t2_numerico = (
            numero_real(
                v2
            )
        )

        deslocamento_numerico = (
            numero_real(
                deslocamento
            )
        )

        velocidade_media_numerico = (
            numero_real(
                velocidade_media
            )
        )

        aceleracao_media_numerico = (
            numero_real(
                aceleracao_media
            )
        )


else:

    raise ValueError(
        "Ação desconhecida."
    )


# =============================================================
# 21. RESOLUÇÃO DOS EVENTOS
# =============================================================

if tipo_operacao == "evento":

    if alvo.free_symbols:

        raise ValueError(
            "O valor-alvo não pode conter variáveis."
        )


    solucoes = sp.solveset(
        expressao_evento - alvo,
        t,
        domain=dominio
    )


    if solucoes == sp.EmptySet:

        tipo_evento = "nenhuma"


    elif solucoes == dominio:

        tipo_evento = (
            "todo_dominio"
        )


    elif isinstance(
        solucoes,
        sp.FiniteSet
    ):

        tipo_evento = "pontos"


        solucoes_ordenadas = sorted(
            list(
                solucoes
            ),
            key=numero_real
        )


        solucoes_exatas = [

            str(
                sp.simplify(
                    valor
                )
            )

            for valor
            in solucoes_ordenadas
        ]


        solucoes_numericas = [

            numero_real(
                valor
            )

            for valor
            in solucoes_ordenadas
        ]


    else:

        tipo_evento = (
            "nao_reduzido"
        )

        solucoes_exatas = [
            str(
                solucoes
            )
        ]


# =============================================================
# 22. RESULTADOS DOS EXTREMOS
# =============================================================

if tipo_operacao == "extremos":

    extremos_tipo = (
        dados_extremos[
            "tipo"
        ]
    )

    extremos_mensagem = (
        dados_extremos[
            "mensagem"
        ]
    )


    minimo_valor_exato = (
        dados_extremos[
            "min_val_exato"
        ]
    )

    minimo_valor_numerico = (
        dados_extremos[
            "min_val_num"
        ]
    )

    minimo_tempos_exatos = (
        dados_extremos[
            "min_t_exatos"
        ]
    )

    minimo_tempos_numericos = (
        dados_extremos[
            "min_t_nums"
        ]
    )


    maximo_valor_exato = (
        dados_extremos[
            "max_val_exato"
        ]
    )

    maximo_valor_numerico = (
        dados_extremos[
            "max_val_num"
        ]
    )

    maximo_tempos_exatos = (
        dados_extremos[
            "max_t_exatos"
        ]
    )

    maximo_tempos_numericos = (
        dados_extremos[
            "max_t_nums"
        ]
    )


# =============================================================
# 23. OBJETO DEVOLVIDO AO JAVASCRIPT
# =============================================================

resultado_python = {

    "x":
        str(
            sp.factor(
                x
            )
        ),

    "v":
        str(
            sp.factor(
                v
            )
        ),

    "a":
        str(
            sp.factor(
                a
            )
        ),

    "t_inicial":
        t_inicial,

    "t_final":
        t_final,

    "acao":
        acao,

    "tipo_operacao":
        tipo_operacao,


    # ---------------------------------------------------------
    # EVENTOS
    # ---------------------------------------------------------

    "grandeza_nome":
        grandeza_nome,

    "unidade":
        unidade,

    "alvo":
        (
            str(
                sp.simplify(
                    alvo
                )
            )
            if alvo is not None
            else ""
        ),

    "tipo_evento":
        tipo_evento,

    "solucoes_exatas":
        solucoes_exatas,

    "solucoes_numericas":
        solucoes_numericas,


    # ---------------------------------------------------------
    # AVALIAÇÃO
    # ---------------------------------------------------------

    "instante_exato":
        instante_exato,

    "instante_numerico":
        instante_numerico,

    "avaliacao_valida":
        avaliacao_valida,

    "avaliacao_mensagem":
        avaliacao_mensagem,

    "x_avaliado_exato":
        x_avaliado_exato,

    "v_avaliado_exato":
        v_avaliado_exato,

    "a_avaliado_exato":
        a_avaliado_exato,

    "x_avaliado_numerico":
        x_avaliado_numerico,

    "v_avaliado_numerico":
        v_avaliado_numerico,

    "a_avaliado_numerico":
        a_avaliado_numerico,


    # ---------------------------------------------------------
    # EXTREMOS
    # ---------------------------------------------------------

    "extremos_tipo":
        extremos_tipo,

    "extremos_mensagem":
        extremos_mensagem,

    "extremos_grandeza_nome":
        extremos_grandeza_nome,

    "extremos_unidade":
        extremos_unidade,

    "minimo_valor_exato":
        minimo_valor_exato,

    "minimo_valor_numerico":
        minimo_valor_numerico,

    "minimo_tempos_exatos":
        minimo_tempos_exatos,

    "minimo_tempos_numericos":
        minimo_tempos_numericos,

    "maximo_valor_exato":
        maximo_valor_exato,

    "maximo_valor_numerico":
        maximo_valor_numerico,

    "maximo_tempos_exatos":
        maximo_tempos_exatos,

    "maximo_tempos_numericos":
        maximo_tempos_numericos,


    # ---------------------------------------------------------
    # MÉDIAS
    # ---------------------------------------------------------

    "medias_valida":
        medias_valida,

    "medias_mensagem":
        medias_mensagem,

    "media_t1_exato":
        media_t1_exato,

    "media_t2_exato":
        media_t2_exato,

    "media_t1_numerico":
        media_t1_numerico,

    "media_t2_numerico":
        media_t2_numerico,

    "delta_t_exato":
        delta_t_exato,

    "delta_t_numerico":
        delta_t_numerico,

    "x_t1_exato":
        x_t1_exato,

    "x_t2_exato":
        x_t2_exato,

    "x_t1_numerico":
        x_t1_numerico,

    "x_t2_numerico":
        x_t2_numerico,

    "v_t1_exato":
        v_t1_exato,

    "v_t2_exato":
        v_t2_exato,

    "v_t1_numerico":
        v_t1_numerico,

    "v_t2_numerico":
        v_t2_numerico,

    "deslocamento_exato":
        deslocamento_exato,

    "deslocamento_numerico":
        deslocamento_numerico,

    "velocidade_media_exato":
        velocidade_media_exato,

    "velocidade_media_numerico":
        velocidade_media_numerico,

    "aceleracao_media_exato":
        aceleracao_media_exato,

    "aceleracao_media_numerico":
        aceleracao_media_numerico
}


resultado_python
            `);


        /*
            ====================================================
            PYTHON -> JAVASCRIPT
            ====================================================
        */

        const dados =
            resposta.toJs({
                dict_converter:
                    Object.fromEntries
            });


        /*
            ====================================================
            BLOCO COMUM
            ====================================================
        */

        let html = `
            <p>
                <strong>Domínio:</strong>
                ${dados.t_inicial}
                ≤ t ≤
                ${dados.t_final}
            </p>

            <p>
                <strong>x(t):</strong>
                ${dados.x}
            </p>

            <p>
                <strong>v(t):</strong>
                ${dados.v}
            </p>

            <p>
                <strong>a(t):</strong>
                ${dados.a}
            </p>
        `;


        /*
            ====================================================
            AVALIAÇÃO EM t0
            ====================================================
        */

        if (
            dados.tipo_operacao ===
            "avaliacao"
        ) {

            html += `
                <hr>

                <p>
                    <strong>
                        Instante avaliado:
                    </strong>

                    t =
                    ${dados.instante_exato}
                    s
                </p>
            `;


            if (
                !dados.avaliacao_valida
            ) {

                html += `
                    <p>
                        ${dados.avaliacao_mensagem}
                    </p>
                `;
            }


            else {

                html += `
                    <p>
                        <strong>
                            Estado da partícula:
                        </strong>
                    </p>

                    <p>
                        x(${dados.instante_exato})
                        =
                        ${formatarValor(
                            dados.x_avaliado_exato,
                            Number(
                                dados.x_avaliado_numerico
                            ),
                            "m"
                        )}
                    </p>

                    <p>
                        v(${dados.instante_exato})
                        =
                        ${formatarValor(
                            dados.v_avaliado_exato,
                            Number(
                                dados.v_avaliado_numerico
                            ),
                            "m/s"
                        )}
                    </p>

                    <p>
                        a(${dados.instante_exato})
                        =
                        ${formatarValor(
                            dados.a_avaliado_exato,
                            Number(
                                dados.a_avaliado_numerico
                            ),
                            "m/s²"
                        )}
                    </p>
                `;
            }
        }


        /*
            ====================================================
            EVENTOS
            ====================================================
        */

        if (
            dados.tipo_operacao ===
            "evento"
        ) {

            html += `
                <hr>

                <p>
                    <strong>
                        Condição física:
                    </strong>

                    ${dados.grandeza_nome}
                    =
                    ${dados.alvo}
                    ${dados.unidade}
                </p>
            `;


            if (
                dados.tipo_evento ===
                "nenhuma"
            ) {

                html += `
                    <p>
                        Não foram encontrados
                        instantes que satisfaçam
                        essa condição dentro do
                        domínio informado.
                    </p>
                `;
            }


            else if (
                dados.tipo_evento ===
                "todo_dominio"
            ) {

                html += `
                    <p>
                        A condição é satisfeita
                        em todo o domínio informado.
                    </p>
                `;


                if (
                    dados.acao ===
                    "parar"
                ) {

                    html += `
                        <p>
                            A partícula permanece
                            em repouso durante todo
                            o intervalo analisado.
                        </p>
                    `;
                }
            }


            else if (
                dados.tipo_evento ===
                "pontos"
            ) {

                html += `
                    <p>
                        <strong>
                            Instantes encontrados:
                        </strong>
                    </p>

                    ${listaTempos(
                        dados.solucoes_exatas,
                        dados.solucoes_numericas
                    )}
                `;
            }


            else {

                html += `
                    <p>
                        O SymPy encontrou uma solução,
                        mas ela não pôde ser reduzida
                        automaticamente a instantes
                        isolados.
                    </p>

                    <p>
                        <strong>
                            Solução simbólica:
                        </strong>

                        ${dados.solucoes_exatas[0]}
                    </p>
                `;
            }
        }


        /*
            ====================================================
            EXTREMOS
            ====================================================
        */

        if (
            dados.tipo_operacao ===
            "extremos"
        ) {

            html += `
                <hr>

                <p>
                    <strong>Análise:</strong>

                    extremos globais de
                    ${dados.extremos_grandeza_nome}
                    no domínio informado.
                </p>
            `;


            if (
                dados.extremos_tipo ===
                "limitacao"
            ) {

                html += `
                    <p>
                        ${dados.extremos_mensagem}
                    </p>
                `;
            }


            else if (
                dados.extremos_tipo ===
                "constante"
            ) {

                html += `
                    <p>
                        A grandeza é constante
                        em todo o domínio.
                    </p>

                    <p>
                        <strong>
                            Mínimo global:
                        </strong>

                        ${formatarValor(
                            dados.minimo_valor_exato,
                            Number(
                                dados.minimo_valor_numerico
                            ),
                            dados.extremos_unidade
                        )}
                    </p>

                    <p>
                        <strong>
                            Máximo global:
                        </strong>

                        ${formatarValor(
                            dados.maximo_valor_exato,
                            Number(
                                dados.maximo_valor_numerico
                            ),
                            dados.extremos_unidade
                        )}
                    </p>

                    <p>
                        Ambos ocorrem em todo
                        o intervalo analisado.
                    </p>
                `;
            }


            else {

                html += `
                    <p>
                        <strong>
                            Mínimo global:
                        </strong>

                        ${formatarValor(
                            dados.minimo_valor_exato,
                            Number(
                                dados.minimo_valor_numerico
                            ),
                            dados.extremos_unidade
                        )}
                    </p>

                    <p>
                        <strong>
                            Ocorre em:
                        </strong>
                    </p>

                    ${listaTempos(
                        dados.minimo_tempos_exatos,
                        dados.minimo_tempos_numericos
                    )}

                    <p>
                        <strong>
                            Máximo global:
                        </strong>

                        ${formatarValor(
                            dados.maximo_valor_exato,
                            Number(
                                dados.maximo_valor_numerico
                            ),
                            dados.extremos_unidade
                        )}
                    </p>

                    <p>
                        <strong>
                            Ocorre em:
                        </strong>
                    </p>

                    ${listaTempos(
                        dados.maximo_tempos_exatos,
                        dados.maximo_tempos_numericos
                    )}
                `;
            }
        }


        /*
            ====================================================
            DESLOCAMENTO E MÉDIAS
            ====================================================
        */

        if (
            dados.tipo_operacao ===
            "medias"
        ) {

            html += `
                <hr>

                <p>
                    <strong>
                        Intervalo analisado:
                    </strong>

                    ${dados.media_t1_exato}
                    ≤ t ≤
                    ${dados.media_t2_exato}
                    s
                </p>
            `;


            if (
                !dados.medias_valida
            ) {

                html += `
                    <p>
                        ${dados.medias_mensagem}
                    </p>
                `;
            }


            else {

                html += `
                    <p>
                        <strong>
                            Estado nas extremidades:
                        </strong>
                    </p>

                    <p>
                        x(${dados.media_t1_exato})
                        =
                        ${formatarValor(
                            dados.x_t1_exato,
                            Number(
                                dados.x_t1_numerico
                            ),
                            "m"
                        )}
                    </p>

                    <p>
                        x(${dados.media_t2_exato})
                        =
                        ${formatarValor(
                            dados.x_t2_exato,
                            Number(
                                dados.x_t2_numerico
                            ),
                            "m"
                        )}
                    </p>

                    <p>
                        v(${dados.media_t1_exato})
                        =
                        ${formatarValor(
                            dados.v_t1_exato,
                            Number(
                                dados.v_t1_numerico
                            ),
                            "m/s"
                        )}
                    </p>

                    <p>
                        v(${dados.media_t2_exato})
                        =
                        ${formatarValor(
                            dados.v_t2_exato,
                            Number(
                                dados.v_t2_numerico
                            ),
                            "m/s"
                        )}
                    </p>

                    <p>
                        <strong>Δt:</strong>

                        ${formatarValor(
                            dados.delta_t_exato,
                            Number(
                                dados.delta_t_numerico
                            ),
                            "s"
                        )}
                    </p>

                    <p>
                        <strong>
                            Deslocamento Δx:
                        </strong>

                        ${formatarValor(
                            dados.deslocamento_exato,
                            Number(
                                dados.deslocamento_numerico
                            ),
                            "m"
                        )}
                    </p>

                    <p>
                        <strong>
                            Velocidade média:
                        </strong>

                        ${formatarValor(
                            dados.velocidade_media_exato,
                            Number(
                                dados.velocidade_media_numerico
                            ),
                            "m/s"
                        )}
                    </p>

                    <p>
                        <strong>
                            Aceleração média:
                        </strong>

                        ${formatarValor(
                            dados.aceleracao_media_exato,
                            Number(
                                dados.aceleracao_media_numerico
                            ),
                            "m/s²"
                        )}
                    </p>
                `;
            }
        }


        resultado.innerHTML =
            html;


        resposta.destroy();

    }

    catch (erro) {

        console.error(
            erro
        );

        resultado.innerHTML = `
            <p>
                Não foi possível interpretar
                ou resolver os dados fornecidos.
            </p>

            <p>
                Verifique a função,
                o domínio e os valores informados.
            </p>
        `;
    }
}


/*
    ============================================================
    EVENTOS DA INTERFACE
    ============================================================
*/

seletorAcao.addEventListener(
    "change",
    atualizarCamposExtras
);


botao.addEventListener(
    "click",
    calcularMovimento
);


atualizarCamposExtras();


iniciarPython();